/* eslint-disable import/no-unresolved */
import * as core from '@actions/core';
import { context } from '@actions/github';
import { Octokit } from '@octokit/core';
import { throttling } from '@octokit/plugin-throttling';

import type { WebhookPayload } from '@actions/github/lib/interfaces';
import { GhIssue } from '../types';
import { INPUTS } from '../utils/lib/inputs';

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
    const MyOctokit = Octokit.plugin(throttling);
    this.octokit = new MyOctokit({
      auth: this.token,
      throttle: {
        // @ts-expect-error it's fine buddy :)
        onRateLimit: (retryAfter, options, octokit, retryCount) => {
          octokit.log.warn(
            `Request quota exhausted for request ${options.method} ${options.url}`,
          );

          if (retryCount < 1) {
            // only retries once
            octokit.log.info(`Retrying after ${retryAfter} seconds!`);
            return true;
          }
        },
        onSecondaryRateLimit: (retryAfter, options, octokit) => {
          // does not retry, only logs a warning
          octokit.log.warn(
            `SecondaryRateLimit detected for request ${options.method} ${options.url}`,
          );
        },
      },
    });
  }

  async handle_unassignments() {
    // Find all open issues with the assigned_label
    const issues = await this.getIssues();

    core.info(`⚙ Processing ${issues.length} issues:`);

    for (const issue of issues) {
      // Ensure that the issue is assigned to someone
      if (!issue.assignee) continue;

      // Unassign the user
      core.info(
        `🔗 UnAssigning @${issue.assignee.login} from issue #${issue.number}`,
      );

      await this.unassignIssue(issue);

      core.info(`✅ Done processing issue #${issue.number}`);
    }
  }

  private async getIssues(): Promise<GhIssue[]> {
    const { owner, repo } = this.context.repo;

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

    const issues = await this.octokit.request(
      `GET /search/issues?q=${q.join(
        ' ',
      )}&sort=updated&order=desc&per_page=100`,
      {
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );

    return issues.data.items;
  }

  private async unassignIssue(issue: GhIssue | WebhookPayload['issue']) {
    return Promise.all([
      this.octokit.request(
        'DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees',
        {
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          issue_number: issue?.number!,
          assignees: [this.context.payload.issue?.assignee!.login],
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
    ]);
  }

  private since(days: number) {
    const totalDaysInMilliseconds = days * 24 * 60 * 60 * 1000;
    const date = new Date(+new Date() - totalDaysInMilliseconds);

    return new Date(date).toISOString().substring(0, 10);
  }
}
