import * as core from '@actions/core';
import { context } from '@actions/github';
import { Octokit } from '@octokit/core';
import { throttling } from '@octokit/plugin-throttling';
import mustache from 'mustache';

import type { WebhookPayload } from '@actions/github/lib/interfaces';
import { GhIssue } from '../types';
import { INPUTS } from '../utils/lib/inputs';

const MyOctokit = Octokit.plugin(throttling);

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
      await this.getAllAssignedIssues();

    // Process unassignment for stale issues
    if (unassignIssues.length > 0) {
      await this.processUnassignments(unassignIssues);
    } else {
      core.info('No issues to unassign');
    }

    // Process reminders if enabled
    const enableReminder = core.getInput(INPUTS.ENABLE_REMINDER);
    if (enableReminder === 'true' && reminderIssues.length > 0) {
      await this.processReminders(reminderIssues);
    } else if (enableReminder === 'true') {
      core.info('No issues need reminders at this time');
    }
  }

  private async getAllAssignedIssues() {
    const { owner, repo } = this.context.repo;
    const daysUntilUnassign = Number(core.getInput(INPUTS.DAYS_UNTIL_UNASSIGN));

    // Calculate reminder days
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

    // Get all open issues with the assigned label in one request
    const { data: issues } = await this.octokit.request(
      'GET /repos/{owner}/{repo}/issues',
      {
        owner,
        repo,
        state: 'open',
        labels: this.assignedLabel,
        per_page: 100,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );

    core.info(
      `📊 Found ${issues.length} open issues with the ${this.assignedLabel} label`,
    );

    // Get activity for each issue
    const unassignIssues = [];
    const reminderIssues = [];

    // Process in chunks of 10 to avoid rate limits
    const chunks = this.chunkArray(issues, 10);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      core.info(
        `Processing chunk ${i + 1}/${chunks.length} (${chunks.length} issues)`,
      );

      // Process chunk in parallel
      const results = await Promise.all(
        chunk.map(async (issue) => {
          // Skip issues without assignees
          if (!issue.assignee) return null;

          // Skip issues with exempt label
          if (issue.labels.some((label) => label.name === this.exemptLabel))
            return null;

          // Get the issue activity
          const activityData = await this.getIssueActivity(issue);
          if (!activityData) return null;

          return {
            issue,
            activityData,
          };
        }),
      );

      // Filter out nulls and categorize issues
      for (const result of results.filter(Boolean)) {
        const { issue, activityData } = result;
        const { lastActivityDate, daysSinceActivity } = activityData;

        if (daysSinceActivity >= daysUntilUnassign) {
          unassignIssues.push(issue);
        } else if (
          daysSinceActivity >= reminderDays &&
          daysSinceActivity < daysUntilUnassign &&
          !(await this.hasReminderAlready(issue))
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

  private async getIssueActivity(issue) {
    try {
      // Get issue comments to analyze activity
      const { data: comments } = await this.octokit.request(
        'GET /repos/{owner}/{repo}/issues/{issue_number}/comments',
        {
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          issue_number: issue.number,
          per_page: 20, // Limit to most recent comments
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );

      // Use the issue's assigned date as the baseline
      // This is typically when the label was added or the user was assigned
      const assignmentDate = new Date(issue.created_at); // Default to issue creation

      // Find the last activity date from comments
      let lastActivityDate = new Date(issue.updated_at); // Default to issue updated date

      // Check for specific activity marker
      const requireTriggerActive = core.getBooleanInput(
        INPUTS.REQUIRE_TRIGGER_ACTIVE,
      );
      if (requireTriggerActive) {
        const triggerActive = core.getInput(INPUTS.TRIGGER_ACTIVE);
        const foundActive = comments.some(
          (comment) =>
            comment.user.login === issue.assignee.login &&
            comment.body.toLowerCase().includes(triggerActive.toLowerCase()),
        );

        if (foundActive) {
          // If they used the active trigger, look at the most recent active trigger comment
          const activeComment = comments
            .filter(
              (comment) =>
                comment.user.login === issue.assignee.login &&
                comment.body
                  .toLowerCase()
                  .includes(triggerActive.toLowerCase()),
            )
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            )[0];

          if (activeComment) {
            lastActivityDate = new Date(activeComment.created_at);
          }
        }
      } else {
        // Otherwise use any comment from the assignee as activity
        const assigneeComments = comments
          .filter((comment) => comment.user.login === issue.assignee.login)
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );

        if (assigneeComments.length > 0) {
          lastActivityDate = new Date(assigneeComments[0].created_at);
        }
      }

      // Calculate days since last activity
      const daysSinceActivity = this.getDaysBetween(
        lastActivityDate,
        new Date(),
      );

      return {
        assignmentDate,
        lastActivityDate,
        daysSinceActivity,
      };
    } catch (error) {
      core.warning(
        `Error getting activity for issue #${issue.number}: ${error}`,
      );
      return null;
    }
  }

  private async hasReminderAlready(issue) {
    try {
      const { data: comments } = await this.octokit.request(
        'GET /repos/{owner}/{repo}/issues/{issue_number}/comments',
        {
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          issue_number: issue.number,
          per_page: 10, // Just check recent comments
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );

      // Check if there's already a reminder comment
      const reminderComment = core.getInput(INPUTS.REMINDER_COMMENT);
      const reminderMarker = reminderComment.split('\n')[0]; // Use first line as marker

      return comments.some(
        (comment) =>
          comment.user.login === 'github-actions[bot]' &&
          comment.body.includes(reminderMarker),
      );
    } catch (error) {
      core.warning(
        `Error checking for reminders on issue #${issue.number}: ${error}`,
      );
      return false; // Assume no reminder if we can't check
    }
  }

  private async processUnassignments(issues) {
    core.info(`⚙️ Processing ${issues.length} issues for unassignment`);
    const unassignedIssues = [];

    // Process in chunks of 5
    const chunks = this.chunkArray(issues, 5);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      core.info(`Processing unassignment chunk ${i + 1}/${chunks.length}`);

      // Process chunk in parallel
      const results = await Promise.all(
        chunk.map(async (issue) => {
          try {
            core.info(
              `🔄 Unassigning @${issue.assignee.login} from issue #${issue.number}`,
            );
            await this.unassignIssue(issue);
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

  private async processReminders(issues) {
    core.info(`⚙️ Processing ${issues.length} issues for reminders`);

    // Process in chunks of 5
    const chunks = this.chunkArray(issues, 5);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      core.info(`Processing reminder chunk ${i + 1}/${chunks.length}`);

      // Process chunk in parallel
      await Promise.all(
        chunk.map(async (issue) => {
          try {
            core.info(
              `🔔 Sending reminder to @${issue.assignee.login} for issue #${issue.number}`,
            );
            await this.sendReminderForIssue(issue);
            core.info(`✅ Reminder sent for issue #${issue.number}`);
          } catch (error) {
            core.warning(
              `Failed to send reminder for issue #${issue.number}: ${error}`,
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

  private async unassignIssue(issue) {
    const body = mustache.render(core.getInput(INPUTS.UNASSIGNED_COMMENT), {
      handle: issue.assignee.login,
      pin_label: core.getInput(INPUTS.PIN_LABEL),
    });

    return Promise.all([
      // Unassign the user
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
      // Remove the assigned label
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
      // Add the comment
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

  private async sendReminderForIssue(issue) {
    const totalDays = Number(core.getInput(INPUTS.DAYS_UNTIL_UNASSIGN));
    let reminderDays = core.getInput(INPUTS.REMINDER_DAYS);
    let daysRemaining;

    if (reminderDays === 'auto') {
      daysRemaining = Math.ceil(totalDays / 2);
    } else {
      daysRemaining = Number(reminderDays);
    }

    const body = mustache.render(core.getInput(INPUTS.REMINDER_COMMENT), {
      handle: issue.assignee.login,
      days_remaining: daysRemaining,
      pin_label: core.getInput(INPUTS.PIN_LABEL),
    });

    // Just add the comment - no need to add a special label
    return this.octokit.request(
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
    );
  }

  // Utility function to split array into chunks
  private chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Utility function to calculate days between dates
  private getDaysBetween(start, end) {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
