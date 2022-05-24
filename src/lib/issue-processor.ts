import * as core from '@actions/core';
import * as github from '@actions/github';
import { Issue } from '../types';

export default class StaleAssignments {
  private assignmentDuration: number;
  private client: any;
  private token: string;

  constructor() {
    this.assignmentDuration = parseInt(
      core.getInput('days_until_unassign'),
      10
    );
    this.token = core.getInput('github_token');
    this.client = github.getOctokit(this.token);
  }

  async getStaleAssignments() {
    const assignedLabel = core.getInput('assigned_label');
    const exemptLabel = core.getInput('pin_label');
    const { owner, repo } = github.context.repo;

    const timestamp = this.since(this.assignmentDuration);

    const q = [
      // Only get issues with the label that shows they've been assigned
      `label:"${assignedLabel}"`,
      // Don't include include issues that can be stale
      `-label:"${exemptLabel}"`,
      // Only include issues, not PRs
      'is:issue',
      // Only search within this repository
      `repo:${owner}/${repo}`,
      // Only find issues/PRs with an assignee.
      'assigned:*',
      // Only find opened issues/PRs
      'is:open',
      // Updated within the last X days
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

  hasStaleAssignmentLabel() {
    return github.context.payload.issue?.labels?.some(
      (l: { name: string }) =>
        l.name === core.getInput('stale_assignment_label')
    );
  }

  async unassignIssue(issue: Issue) {
    return Promise.all([
      await this.client.rest.issues.removeAssignees({
        ...github.context.repo,
        issue_number: issue?.number as number,
        assignees: [issue?.assignee.login],
      }),
      await this.client.rest.issues.removeLabel({
        ...github.context.repo,
        issue_number: issue?.number as number,
        name: core.getInput('assigned_label'),
      }),
    ]);
  }

  since(days: number) {
    const ttl = days * 24 * 60 * 60 * 1000;
    let date = new Date(+new Date() - ttl);

    // const ttl = new Date().setDate(
    //   new Date().getDate() - days
    // );
    // return new Date(date).toISOString().substring(0, 10);

    // ? GitHub won't allow it
    if (date < new Date(0)) {
      date = new Date(0);
    }

    return new Date(date).toISOString().substring(0, 10);
  }
}
