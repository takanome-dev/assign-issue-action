import { getInput } from '@actions/core';
import { context, getOctokit } from '@actions/github';

import type { WebhookPayload } from '@actions/github/lib/interfaces';

import { Issue } from '../../types';

export default class IssueHandler {
  private assignmentDuration: number;
  private client: ReturnType<typeof getOctokit>;
  private token: string;
  private assignedLabel: string;
  private exemptLabel: string;

  constructor() {
    this.assignmentDuration = Number(getInput('days_until_unassign'));
    this.token = getInput('github_token', { required: true });
    this.client = getOctokit(this.token);
    this.assignedLabel = getInput('assigned_label');
    this.exemptLabel = getInput('pin_label');
  }

  async getIssues(): Promise<Issue[]> {
    const { owner, repo } = context.repo;

    const timestamp = this.since(this.assignmentDuration);

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
      // Updated within the last 7 days (or whatever the user has set)
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

  async unassignIssue(issue: Issue | WebhookPayload['issue']) {
    return Promise.all([
      await this.client.rest.issues.removeAssignees({
        ...context.repo,
        issue_number: issue?.number!,
        assignees: [issue?.assignee!.login],
      }),
      await this.client.rest.issues.removeLabel({
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
