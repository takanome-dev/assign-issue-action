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
    const issues = await this.getIssues();
    core.info(`⚙ Processing ${issues.length} issues for unassignment:`);

    if (issues.length === 0) {
      core.info('🔔 No issues found for unassignment');
      return;
    }

    const unassignedIssues = [];
    for (const issue of issues) {
      if (!issue.assignee) continue;

      core.info(
        `🔗 Unassigning @${issue.assignee.login} from issue #${issue.number} due to inactivity`,
      );

      await this.unassignIssue(issue);
      unassignedIssues.push(issue.number);
      core.info(`✅ Done processing issue #${issue.number}`);
    }

    // Process reminders
    const enableReminder = core.getInput(INPUTS.ENABLE_REMINDER);
    if (enableReminder === 'true') {
      await this.send_reminders();
    }

    core.setOutput('unassigned_issues', unassignedIssues);
    core.info(`✅ Done processing cron job`);
  }

  async send_reminders() {
    const reminderIssues = await this.get_issues_for_reminder();
    core.info(`⚙ Processing ${reminderIssues.length} issues for reminders:`);

    if (reminderIssues.length === 0) {
      core.info('🔔 No issues found for reminders');
      return;
    }

    for (const issue of reminderIssues) {
      if (!issue.assignee) continue;

      core.info(
        `📬 Sending reminder to @${issue.assignee.login} for issue #${issue.number}`,
      );

      await this.send_reminder_notification(issue);
      core.info(`✅ Done sending reminder for issue #${issue.number}`);
    }
  }

  private async getIssues(): Promise<GhIssue[]> {
    const { owner, repo } = this.context.repo;

    const totalDays = Number(core.getInput(INPUTS.DAYS_UNTIL_UNASSIGN));
    const timestamp = this.since(totalDays);

    core.info(`🤖 Searching issues updated since ${timestamp}`);

    const q = [
      `label:"${this.assignedLabel}"`,
      `-label:"${this.exemptLabel}"`,
      'is:issue',
      `repo:${owner}/${repo}`,
      'assignee:*',
      'is:open',
      `updated:<${timestamp}`,
    ];

    const issues = await this.octokit.request(
      `GET /search/issues?q=${encodeURIComponent(q.join(' '))}`,
      {
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );

    return issues.data.items;
  }

  private async unassignIssue(issue: GhIssue | WebhookPayload['issue']) {
    const body = mustache.render(core.getInput(INPUTS.UNASSIGNED_COMMENT), {
      handle: issue?.assignee?.login,
      pin_label: core.getInput(INPUTS.PIN_LABEL),
    });

    return Promise.allSettled([
      this.octokit.request(
        'DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees',
        {
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          issue_number: issue?.number!,
          assignees: [issue?.assignees.map((ass: any) => ass.login).join(',')],
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
          issue_number: issue?.number!,
          body,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      ),
    ]);
  }

  private since(days: number) {
    const totalDaysInMilliseconds = days * 24 * 60 * 60 * 1000;
    const date = new Date(+new Date() - totalDaysInMilliseconds);

    return new Date(date).toISOString().substring(0, 10);
  }

  private async get_issues_for_reminder(): Promise<GhIssue[]> {
    const { owner, repo } = this.context.repo;
    const totalDays = Number(core.getInput(INPUTS.DAYS_UNTIL_UNASSIGN));

    let reminderDays = core.getInput(INPUTS.REMINDER_DAYS);
    let daysBeforeReminder;

    if (reminderDays === 'auto') {
      daysBeforeReminder = Math.floor(totalDays / 2);
    } else {
      daysBeforeReminder = totalDays - Number(reminderDays);
    }

    daysBeforeReminder = Math.max(1, daysBeforeReminder);

    const timestamp = this.since(daysBeforeReminder);
    core.info(`🤖 Searching issues for reminder - updated since ${timestamp}`);

    const q = [
      `label:"${this.assignedLabel}"`,
      `-label:"${this.exemptLabel}"`,
      '-label:"🔔 reminder-sent"',
      'is:issue',
      `repo:${owner}/${repo}`,
      'assignee:*',
      'is:open',
      `updated:<${timestamp}`,
    ];

    const issues = await this.octokit.request(
      `GET /search/issues?q=${encodeURIComponent(q.join(' '))}`,
      {
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );

    return issues.data.items;
  }

  private async send_reminder_notification(
    issue: GhIssue | WebhookPayload['issue'],
  ) {
    const totalDays = Number(core.getInput(INPUTS.DAYS_UNTIL_UNASSIGN));
    let reminderDays = core.getInput(INPUTS.REMINDER_DAYS);
    let daysRemaining;

    if (reminderDays === 'auto') {
      daysRemaining = Math.ceil(totalDays / 2);
    } else {
      daysRemaining = Number(reminderDays);
    }

    const body = mustache.render(core.getInput(INPUTS.REMINDER_COMMENT), {
      handle: issue?.assignee?.login,
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
          labels: ['🔔 reminder-sent'], // Add a "reminder sent" label to avoid sending multiple reminders
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
