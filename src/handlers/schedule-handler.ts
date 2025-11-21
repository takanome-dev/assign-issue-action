import * as core from '@actions/core';
import { context } from '@actions/github';
import { Octokit } from '@octokit/core';
import { throttling } from '@octokit/plugin-throttling';
import mustache from 'mustache';

import { components } from '@octokit/openapi-types';

import { INPUTS } from '../utils/lib/inputs';
import { chunkArray, getDaysBetween } from '../utils/helpers/common';

const MyOctokit = Octokit.plugin(throttling);

type Issue = components['schemas']['issue-search-result-item'];
type ExtendedIssue = {
  issue: Issue;
  lastActivityDate: Date;
  daysSinceActivity: number;
  hasReminderLabel: boolean;
};

export default class ScheduleHandler {
  private token: string;
  private assignedLabel: string;
  private exemptLabel: string;
  private octokit: Octokit;
  private context = context;

  constructor() {
    this.token = core.getInput(INPUTS.GITHUB_TOKEN, { required: true });
    this.assignedLabel = core.getInput(INPUTS.ASSIGNED_LABEL);
    this.exemptLabel = core.getInput(INPUTS.PIN_LABEL);
    this.octokit = new MyOctokit({
      auth: this.token,
      throttle: {
        onRateLimit: (retryAfter, options, octokit, retryCount) => {
          core.warning(
            `⚠️ Request quota exhausted for request ${options.method} ${options.url} ⚠️`,
          );

          if (retryCount < 1) {
            // only retries once
            core.warning(`⚠️ Retrying after ${retryAfter} seconds! ⚠️`);
            return true;
          }
          return false;
        },
        onSecondaryRateLimit: (retryAfter, options, octokit, retryCount) => {
          // Add retry logic for secondary rate limit
          core.warning(
            `⚠️ SecondaryRateLimit detected for request ${options.method} ${options.url} ⚠️`,
          );

          // Retry up to twice for secondary rate limits
          if (retryCount < 2) {
            core.warning(
              `⚠️ Secondary rate limit hit. Retrying after ${retryAfter} seconds! ⚠️`,
            );
            return true;
          }
          return false;
        },
      },
    });
  }

  async handle_unassignments() {
    // Get all assigned issues with their activity status in a single query
    const { unassignIssues, reminderIssues } =
      await this._get_assigned_issues();

    let processedUnassignments: ExtendedIssue[] = [];
    let processedReminders: ExtendedIssue[] = [];

    // Process unassignment for stale issues
    if (unassignIssues.length > 0) {
      processedUnassignments =
        await this._process_unassignments(unassignIssues);
    }

    // Process reminders if enabled
    const enableReminder = core.getInput(INPUTS.ENABLE_REMINDER);
    if (enableReminder !== 'true') {
      // Generate summary even if reminders are disabled
      await this._generate_summary(processedUnassignments, processedReminders);
      return;
    }

    if (reminderIssues.length > 0) {
      processedReminders = await this._process_reminders(reminderIssues);
    }

    // Generate the markdown summary
    await this._generate_summary(processedUnassignments, processedReminders);
  }

  private async _get_assigned_issues() {
    const { owner, repo } = this.context.repo;
    const daysUntilUnassign = Number(core.getInput(INPUTS.DAYS_UNTIL_UNASSIGN));

    let reminderDays;
    const reminderDaysInput = core.getInput(INPUTS.REMINDER_DAYS);
    if (reminderDaysInput === 'auto') {
      reminderDays = Math.floor(daysUntilUnassign / 2);
    } else {
      reminderDays = parseInt(reminderDaysInput);
      if (isNaN(reminderDays)) {
        reminderDays = Math.floor(daysUntilUnassign / 2);
      }
    }

    // core.info(`🔍 Fetching assigned issues from ${owner}/${repo}`);
    // core.info(
    //   `⏱️ Unassign after ${daysUntilUnassign} days, remind after ${reminderDays} days`,
    // );

    // Fetch all open assigned issues, we'll filter in-memory to prioritize unassignment over reminders
    const {
      data: { items: issues },
    } = await this.octokit.request('GET /search/issues', {
      q: `repo:${owner}/${repo} is:issue is:open label:"${this.assignedLabel}" -label:"${this.exemptLabel}" assignee:*`,
      per_page: 100,
      advanced_search: true,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    // core.info(
    //   `📊 Found ${issues.length} open issues with the ${this.assignedLabel} label that are not pinned and currently assigned`,
    // );

    const unassignIssues = [];
    const reminderIssues = [];

    // Process in chunks of 10 to avoid rate limits
    const chunks = chunkArray(issues, 10);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const results = chunk.map((issue) => ({
        issue,
        lastActivityDate: new Date(issue.updated_at),
        daysSinceActivity: getDaysBetween(
          new Date(issue.updated_at),
          new Date(),
        ),
      }));

      for (const result of results.filter(Boolean)) {
        const hasReminderLabel = result.issue?.labels?.some(
          (label) => label?.name === '🔔 reminder-sent',
        );

        boolean shouldUnassign = (result.daysSinceActivity >= daysUntilUnassign);
        if (hasReminderLabel) {
          shouldUnassign = shouldUnassign ||
            // The last day of activity is (normally) the point in time where the reminder label was sent.
            // Thus, reminderDays already passed of the number of daysUntilUnassign.
            // Therefore, we substract reminderDays from daysUntilUnassign to know the "real" period to wait for.
            (result.daysSinceActivity >= (daysUntilUnassign - reminderDays));
        }
        if (shouldUnassign) {
          unassignIssues.push({ ...result, hasReminderLabel });
          continue;
        }

        if (result.daysSinceActivity >= reminderDays) {
          if (!hasReminderLabel) {
            reminderIssues.push({ ...result, hasReminderLabel });
          }
        }
      }
    }

    core.info(`📋 Found ${unassignIssues.length} issues to unassign`);
    core.info(`🔔 Found ${reminderIssues.length} issues to send reminders for`);

    return { unassignIssues, reminderIssues };
  }

  // fallback to using issue.updated_at instead of fetching timeline events
  // private async _get_issue_activity(issue: Issue) {
  //   try {
  //     const { data: timelines } = await this.octokit.request(
  //       'GET /repos/{owner}/{repo}/issues/{issue_number}/timeline',
  //       {
  //         owner: this.context.repo.owner,
  //         repo: this.context.repo.repo,
  //         issue_number: issue.number,
  //         per_page: 100,
  //         headers: {
  //           'X-GitHub-Api-Version': '2022-11-28',
  //         },
  //       },
  //     );

  //     // Find the actual assignment event in the timeline
  //     const assignmentEvent = timelines.find(
  //       (event) =>
  //         event.event === 'assigned' &&
  //         // @ts-expect-error timeline events have event property but types are incomplete
  //         event.assignee?.login === issue.assignee?.login,
  //     );

  //     // Use assignment date if found, otherwise fall back to issue creation date
  //     const assignmentDate = assignmentEvent
  //       ? // @ts-expect-error created_at exists on timeline events
  //         new Date(assignmentEvent.created_at)
  //       : new Date(issue.created_at);

  //     // Find the most recent activity (last timeline event)
  //     let lastActivityDate;
  //     if (timelines.length > 0) {
  //       // @ts-expect-error created_at exists on timeline events
  //       lastActivityDate = new Date(timelines[timelines.length - 1].created_at);
  //     } else {
  //       // If no timeline events, use the assignment date as last activity
  //       lastActivityDate = assignmentDate;
  //     }

  //     // Calculate days since last activity
  //     const daysSinceActivity = getDaysBetween(lastActivityDate, new Date());

  //     return {
  //       assignmentDate,
  //       lastActivityDate,
  //       daysSinceActivity,
  //     };
  //   } catch (error) {
  //     core.warning(
  //       `⚠️ Error getting activity for issue #${issue.number}: ${error}`,
  //     );
  //     return null;
  //   }
  // }

  private async _process_unassignments(arr: ExtendedIssue[]) {
    const processedResults: ExtendedIssue[] = [];
    const unassignedIssueNumbers = [];

    // Process in chunks of 5
    const chunks = chunkArray(arr, 5);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Process chunk in parallel
      const results = await Promise.allSettled(
        chunk.map(async ({ issue, ...rest }) => {
          try {
            // core.info(
            //   `🔄 Unassigning @${issue?.assignee?.login} from issue #${issue.number}`,
            // );
            await this._unassign_issue(issue);
            // core.info(`✅ Unassigned issue #${issue.number}`);
            return { issue, ...rest };
          } catch (err) {
            // core.warning(
            //   `🚨 Failed to unassign issue #${issue.number}: ${error}`,
            // );
            return { issue, ...rest };
          }
        }),
      );

      processedResults.push(
        ...results.filter((r) => r.status === 'fulfilled').map((r) => r.value),
      );

      // Add successful unassignments to the numbers list for output
      unassignedIssueNumbers.push(
        ...results
          .filter((r) => r.status === 'fulfilled')
          .map((r) => r.value.issue.number),
      );

      // Add delay between chunks
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    core.setOutput('unassigned_issues', unassignedIssueNumbers);
    // core.info(
    //   `✅ Successfully unassigned ${unassignedIssueNumbers.length} issues`,
    // );
    return processedResults;
  }

  private async _process_reminders(arr: ExtendedIssue[]) {
    const processedResults: ExtendedIssue[] = [];

    // Process in chunks of 5
    const chunks = chunkArray(arr, 5);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      // Process chunk in parallel
      const results = await Promise.allSettled(
        chunk.map(async ({ issue, daysSinceActivity, ...rest }) => {
          try {
            // core.info(
            //   `🔔 Sending reminder to @${issue?.assignee?.login} for issue #${issue.number}`,
            // );
            await this._send_reminder_for_issue(issue, daysSinceActivity);
            // core.info(`✅ Reminder sent for issue #${issue.number}`);
            return { issue, daysSinceActivity, ...rest };
          } catch (error) {
            // core.warning(
            //   `🚨 Failed to send reminder for issue #${issue.number}: ${error}`,
            // );
            return { issue, daysSinceActivity, ...rest };
          }
        }),
      );

      processedResults.push(
        ...results.filter((r) => r.status === 'fulfilled').map((r) => r.value),
      );

      // Add delay between chunks
      // if (i < chunks.length - 1) {
      //   await new Promise((resolve) => setTimeout(resolve, 1000));
      // }
    }

    // core.info(
    //   `✅ Successfully sent reminders for ${processedResults.length} issues`,
    // );
    return processedResults;
  }

  private async _unassign_issue(issue: Issue) {
    if (!issue.assignee) {
      // well, this should never happen anyway :)
      core.warning(`⚠️ Issue #${issue.number} has no assignee, skipping...`);
      return;
    }

    const body = mustache.render(core.getInput(INPUTS.UNASSIGNED_COMMENT), {
      handle: issue.assignee.login,
      pin_label: core.getInput(INPUTS.PIN_LABEL),
    });

    return Promise.allSettled([
      this.octokit.request(
        'DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees',
        {
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          issue_number: issue.number,
          assignees: [issue.assignee.login],
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      ),
      this.octokit.request(
        'DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}',
        {
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          issue_number: issue.number,
          name: this.assignedLabel,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      ),
      this.octokit.request(
        'DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}',
        {
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          issue_number: Number(issue?.number),
          name: core.getInput(INPUTS.PIN_LABEL),
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      ),
      this.octokit.request(
        'DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}',
        {
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          issue_number: Number(issue?.number),
          name: '🔔 reminder-sent',
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      ),
      this.octokit.request(
        'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
        {
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          issue_number: issue.number,
          body,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      ),
    ]);
  }

  private async _send_reminder_for_issue(
    issue: Issue,
    daysSinceActivity: number,
  ) {
    const totalDays = Number(core.getInput(INPUTS.DAYS_UNTIL_UNASSIGN));
    const daysRemaining = Math.max(0, totalDays - daysSinceActivity);

    const body = mustache.render(core.getInput(INPUTS.REMINDER_COMMENT), {
      handle: issue.assignee?.login,
      days_remaining: daysRemaining,
      pin_label: core.getInput(INPUTS.PIN_LABEL),
    });

    return Promise.all([
      this.octokit.request(
        'POST /repos/{owner}/{repo}/issues/{issue_number}/labels',
        {
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          issue_number: Number(issue?.number),
          labels: ['🔔 reminder-sent'],
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      ),
      this.octokit.request(
        'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
        {
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          issue_number: Number(issue?.number),
          body,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      ),
    ]);
  }

  private async _generate_summary(
    processedUnassignments: ExtendedIssue[],
    processedReminders: ExtendedIssue[],
  ) {
    if (
      processedUnassignments.length === 0 &&
      processedReminders.length === 0
    ) {
      core.info('✅ No issues to summarize.');
      return;
    }

    const unassignedTable = processedUnassignments.map(
      ({ issue, daysSinceActivity }) => ({
        Issue: `[#${issue.number}](https://github.com/${this.context.repo.owner}/${this.context.repo.repo}/issues/${issue.number})`,
        Assignee: issue.assignee?.login
          ? `[@${issue.assignee.login}](https://github.com/${issue.assignee.login})`
          : 'Unassigned',
        'Days Since Activity': `${daysSinceActivity || 'N/A'}`,
        Status: 'Unassigned',
      }),
    );

    const reminderTable = processedReminders.map(
      ({ issue, daysSinceActivity }) => ({
        Issue: `[#${issue.number}](https://github.com/${this.context.repo.owner}/${this.context.repo.repo}/issues/${issue.number})`,
        Assignee: issue.assignee?.login
          ? `[@${issue.assignee.login}](https://github.com/${issue.assignee.login})`
          : 'Unassigned',
        'Days Since Activity': `${daysSinceActivity || 'N/A'}`,
        Status: 'Reminder Sent',
      }),
    );

    const summary = [
      '## 📋 Summary of Processed Issues',
      '',
      `**Total Issues Processed:** ${processedUnassignments.length + processedReminders.length}`,
      `**Unassigned:** ${processedUnassignments.length} | **Reminders Sent:** ${processedReminders.length}`,
      '',
      '### Unassigned Issues',
      '',
      unassignedTable.length > 0
        ? `| Issue | Assignee | Days Since Activity | Status |` +
          `\n` +
          `|-------|----------|--------------------|--------|` +
          `\n${unassignedTable
            .map(
              (row) =>
                `| ${row.Issue} | ${row.Assignee} | ${row['Days Since Activity']} | ${row.Status} |`,
            )
            .join('\n')}`
        : 'No unassigned issues found.',
      '',
      '### Reminder Sent Issues',
      '',
      reminderTable.length > 0
        ? `| Issue | Assignee | Days Since Activity | Status |` +
          `\n` +
          `|-------|----------|--------------------|--------|` +
          `\n${reminderTable
            .map(
              (row) =>
                `| ${row.Issue} | ${row.Assignee} | ${row['Days Since Activity']} | ${row.Status} |`,
            )
            .join('\n')}`
        : 'No reminder sent issues found.',
      '',
    ];

    core.summary.addRaw(summary.join('\n'));
    await core.summary.write();
  }
}
