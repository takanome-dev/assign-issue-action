import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';

import type { WebhookPayload } from '@actions/github/lib/interfaces';
import { GhIssue } from '../types';
import { INPUTS } from '../utils/lib/inputs';
import { retryWithDelay } from '../utils/lib/retry-with-delay';

export default class ScheduleHandler {
  private client: ReturnType<typeof getOctokit>;
  private token: string;
  private assignedLabel: string;
  private exemptLabel: string;

  constructor() {
    this.token = core.getInput(INPUTS.GITHUB_TOKEN, { required: true });
    this.client = getOctokit(this.token);
    this.assignedLabel = core.getInput(INPUTS.ASSIGNED_LABEL);
    this.exemptLabel = core.getInput(INPUTS.PIN_LABEL);
  }

  async handle_unassignments() {
    // Find all open issues with the assigned_label
    const issues = await retryWithDelay(async () => await this.getIssues());

    core.info(`⚙ Processing ${issues.length} issues:`);

    for (const issue of issues) {
      // Ensure that the issue is assigned to someone
      if (!issue.assignee) continue;

      // Unassign the user
      core.info(
        `🔗 UnAssigning @${issue.assignee.login} from issue #${issue.number}`,
      );

      retryWithDelay(async () => {
        await this.unassignIssue(issue);
      });

      core.info(`✅ Done processing issue #${issue.number}`);
    }
  }

  private async getIssues(): Promise<GhIssue[]> {
    const { owner, repo } = context.repo;

    const totalDays = Number(core.getInput(INPUTS.DAYS_UNTIL_UNASSIGN));
    const timestamp = this.since(totalDays);

    const q = [
      // Only get issues with the label that shows they've been assigned
      `label:"${this.assignedLabel}"`,
      // Don't include include pinned issues
      `-label:"${this.exemptLabel}"`,
      // Only include issues, not PRs
      'is:issue',
      // Only search within this repository
      `repo:${owner}/${repo}`,
      // Only find issues/PRs with an assignee.
      'assigned:*',
      // Only find opened issues/PRs
      'is:open',
      // Updated within the last 7 days (or whatever the user has set for "days_until_unassign")
      `updated:<${timestamp}`,
    ];

    const issues = await this.client.rest.search.issuesAndPullRequests({
      q: q.join(' '),
      sort: 'updated',
      order: 'desc',
      per_page: 100,
    });

    return issues.data.items;
  }

  private async unassignIssue(issue: GhIssue | WebhookPayload['issue']) {
    return Promise.all([
      this.client.rest.issues.removeAssignees({
        ...context.repo,
        issue_number: issue?.number!,
        assignees: [issue?.assignee!.login],
      }),
      this.client.rest.issues.removeLabel({
        ...context.repo,
        issue_number: issue?.number!,
        name: this.assignedLabel,
      }),
    ]);
  }

  private since(days: number) {
    const totalDaysInMilliseconds = days * 24 * 60 * 60 * 1000;
    const date = new Date(+new Date() - totalDaysInMilliseconds);

    return new Date(date).toISOString().substring(0, 10);
  }
}
