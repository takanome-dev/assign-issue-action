import * as core from '@actions/core';
import { context } from '@actions/github';
import { Octokit } from '@octokit/core';
import { throttling } from '@octokit/plugin-throttling';
import mustache from 'mustache';

import { components } from '@octokit/openapi-types';

import { INPUTS } from '../utils/lib/inputs';
import { since, chunkArray, getDaysBetween } from '../utils/helpers/common';

const MyOctokit = Octokit.plugin(throttling);

type Issue = components['schemas']['issue-search-result-item'];

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
        // @ts-expect-error it's fine buddy :)
        onRateLimit: (retryAfter, options, octokit, retryCount) => {
          core.warning(
            `⚠️ Request quota exhausted for request ${options.method} ${options.url} ⚠️`,
          );

          if (retryCount < 1) {
            // only retries once
            core.warning(`⚠️ Retrying after ${retryAfter} seconds! ⚠️`);
            return true;
          }
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
        },
      },
    });
  }

  async handle_unassignments() {
    // Get all assigned issues with their activity status in a single query
    const { unassignIssues, reminderIssues } =
      await this._get_assigned_issues();

    // Process unassignment for stale issues
    if (unassignIssues.length > 0) {
      await this._process_unassignments(unassignIssues);
    } else {
      core.info('🔍 No issues to unassign, skipping...');
    }

    // Process reminders if enabled
    const enableReminder = core.getInput(INPUTS.ENABLE_REMINDER);
    if (enableReminder !== 'true') return;

    if (reminderIssues.length > 0) {
      await this._process_reminders(reminderIssues);
    } else {
      core.info('🔍 No issues need reminders at this time, skipping...');
    }
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

    core.info(`🔍 Fetching assigned issues from ${owner}/${repo}`);
    core.info(
      `⏱️ Unassign after ${daysUntilUnassign} days, remind after ${reminderDays} days`,
    );

    const timestamp = since(reminderDays);
    // Get all open issues with the assigned label and not updated in the last "reminderDays" days
    const {
      data: { items: issues },
    } = await this.octokit.request('GET /search/issues', {
      q: `repo:${owner}/${repo} is:open label:"${this.assignedLabel}" -label:"${this.exemptLabel}" -label:"🔔 reminder-sent" assignee:* updated:<=${timestamp}`,
      per_page: 100,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    core.info(
      `📊 Found ${issues.length} open issues with the ${this.assignedLabel} label`,
    );

    const unassignIssues = [];
    const reminderIssues = [];

    // Process in chunks of 10 to avoid rate limits
    const chunks = chunkArray(issues, 10);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      core.info(
        `Processing chunk ${i + 1}/${chunks.length} (${chunk.length} issues)`,
      );

      // Process chunk in parallel
      const results = await Promise.all(
        chunk.map(async (issue) => {
          const activityData = await this._get_issue_activity(issue);
          if (!activityData) return null;

          return {
            issue,
            activityData,
          };
        }),
      );

      // Filter out nulls and categorize issues
      for (const result of results.filter(Boolean)) {
        if (!result) continue;

        const { issue, activityData } = result;
        if (!activityData) continue;

        const { daysSinceActivity } = activityData;

        if (daysSinceActivity >= daysUntilUnassign) {
          unassignIssues.push(issue);
        } else if (
          daysSinceActivity >= reminderDays &&
          daysSinceActivity < daysUntilUnassign
        ) {
          reminderIssues.push(issue);
        }
      }

      // Add a delay between chunks to prevent rate limiting
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    core.info(`📋 Found ${unassignIssues.length} issues to unassign`);
    core.info(`🔔 Found ${reminderIssues.length} issues to send reminders for`);

    return { unassignIssues, reminderIssues };
  }

  private async _get_issue_activity(issue: Issue) {
    try {
      const {
        data: timelines,
        url,
        status,
      } = await this.octokit.request(
        'GET /repos/{owner}/{repo}/issues/{issue_number}/timeline',
        {
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          issue_number: issue.number,
          per_page: 1,
          page: 1,
          query: 'sort:created-desc event:commented',
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );

      core.info(
        `🔍 Timeline URL just for debugging: ${url} - with status - ${status}`,
      );

      // Use the issue's assigned date as the baseline
      const assignmentDate = new Date(issue.created_at);

      // @ts-expect-error it actually exists but the type is wrong for some reason
      const lastActivityDate = new Date(timelines[0].created_at);

      // Calculate days since last activity
      const daysSinceActivity = getDaysBetween(lastActivityDate, new Date());

      return {
        assignmentDate,
        lastActivityDate,
        daysSinceActivity,
      };
    } catch (error) {
      core.warning(
        `⚠️ Error getting activity for issue #${issue.number}: ${error}`,
      );
      return null;
    }
  }

  private async _process_unassignments(issues: Issue[]) {
    core.info(`⚙️ Processing ${issues.length} issues for unassignment`);
    const unassignedIssues = [];

    // Process in chunks of 5
    const chunks = chunkArray(issues, 5);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      core.info(
        `Processing unassignment chunk ${i + 1}/${chunks.length} (${chunk.length} issues)`,
      );

      // Process chunk in parallel
      const results = await Promise.all(
        chunk.map(async (issue) => {
          try {
            core.info(
              `🔄 Unassigning @${issue?.assignee?.login} from issue #${issue.number}`,
            );
            await this._unassign_issue(issue);
            core.info(`✅ Unassigned issue #${issue.number}`);
            return issue.number;
          } catch (error) {
            core.warning(`Failed to unassign issue #${issue.number}: ${error}`);
            return null;
          }
        }),
      );

      // Add successful unassignments to the list
      unassignedIssues.push(...results.filter(Boolean));

      // Add delay between chunks
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    core.setOutput('unassigned_issues', unassignedIssues);
    core.info(`✅ Successfully unassigned ${unassignedIssues.length} issues`);
  }

  private async _process_reminders(issues: Issue[]) {
    core.info(`⚙️ Processing ${issues.length} issues for reminders`);

    // Process in chunks of 5
    const chunks = chunkArray(issues, 5);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      core.info(
        `Processing reminder chunk ${i + 1}/${chunks.length} (${chunk.length} issues)`,
      );

      // Process chunk in parallel
      await Promise.all(
        chunk.map(async (issue) => {
          try {
            core.info(
              `🔔 Sending reminder to @${issue?.assignee?.login} for issue #${issue.number}`,
            );
            await this._send_reminder_for_issue(issue);
            core.info(`✅ Reminder sent for issue #${issue.number}`);
          } catch (error) {
            core.warning(
              `🚨 Failed to send reminder for issue #${issue.number}: ${error}`,
            );
          }
        }),
      );

      // Add delay between chunks
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    core.info(`✅ Successfully sent reminders for ${issues.length} issues`);
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
          issue_number: issue?.number!,
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
          issue_number: issue?.number!,
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

  private async _send_reminder_for_issue(issue: Issue) {
    const totalDays = Number(core.getInput(INPUTS.DAYS_UNTIL_UNASSIGN));
    let reminderDays = core.getInput(INPUTS.REMINDER_DAYS);
    let daysRemaining;

    if (reminderDays === 'auto') {
      daysRemaining = Math.ceil(totalDays / 2);
    } else {
      daysRemaining = Number(reminderDays);
      if (isNaN(daysRemaining)) {
        daysRemaining = Math.ceil(totalDays / 2);
      }
    }

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
          issue_number: issue?.number!,
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
          issue_number: issue?.number!,
          body,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      ),
    ]);
  }
}
