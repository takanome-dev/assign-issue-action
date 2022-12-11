import * as core from '@actions/core';
import * as github from '@actions/github';
import { Issue } from '../types';

export default class IssueHandler {
  private assignmentDuration: number;
  private client: ReturnType<typeof github.getOctokit>;
  private token: string;
  private assignedLabel: string;
  private exemptLabel: string;

  constructor() {
    this.assignmentDuration = Number(core.getInput('days_until_unassign'));
    this.token = core.getInput('github_token', { required: true });
    this.client = github.getOctokit(this.token);
    this.assignedLabel = core.getInput('assigned_label');
    this.exemptLabel = core.getInput('pin_label');
  }

  async getIssues(): Promise<Issue[]> {
    const { owner, repo } = github.context.repo;

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

  async unassignIssue(issue: Issue) {
    return Promise.all([
      await this.client.rest.issues.removeAssignees({
        ...github.context.repo,
        issue_number: issue?.number,
        assignees: [issue?.assignee!.login],
      }),
      await this.client.rest.issues.removeLabel({
        ...github.context.repo,
        issue_number: issue?.number,
        name: this.assignedLabel,
      }),
    ]);
  }

  private since(days: number) {
    const totalDaysInMiliseconds = days * 24 * 60 * 60 * 1000;
    const date = new Date(+new Date() - totalDaysInMiliseconds);

    return new Date(date).toISOString().substring(0, 10);
  }
}
