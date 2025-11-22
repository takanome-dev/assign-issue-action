import * as core from '@actions/core';
import { Octokit } from '@octokit/core';
import { throttling } from '@octokit/plugin-throttling';
import { context } from '@actions/github';
import mustache from 'mustache';
import { add, format } from 'date-fns';

import type { WebhookPayload } from '@actions/github/lib/interfaces';
import type { GhIssue, GhComment } from '../types';
import type {
  AlreadyAssignedCommentArg,
  AssignmentInterestCommentArg,
  AssignUserCommentArg,
  UnAssignUserCommentArg,
} from '../types/comment';

import { INPUTS } from '../utils/lib/inputs';

const MyOctokit = Octokit.plugin(throttling);

export default class CommentHandler {
  private readonly issue: WebhookPayload['issue'] | GhIssue;
  private readonly comment: WebhookPayload['comment'] | GhComment;
  private token: string;
  private context = context;
  private readonly octokit: Octokit;

  constructor() {
    this.issue = this.context.payload.issue;
    this.comment = this.context.payload.comment;
    this.token = core.getInput(INPUTS.GITHUB_TOKEN);
    this.octokit = new MyOctokit({
      auth: this.token,
      throttle: {
        // @ts-expect-error it's fine buddy :)
        onRateLimit: (retryAfter, options, octokit, retryCount) => {
          core.warning(
            `Request quota exhausted for request ${options.method} ${options.url}`,
          );

          if (retryCount < 1) {
            // only retries once
            core.warning(`Retrying after ${retryAfter} seconds!`);
            return true;
          }
        },
        onSecondaryRateLimit: (retryAfter, options) => {
          // does not retry, only logs a warning
          core.warning(
            `SecondaryRateLimit detected for request ${options.method} ${options.url}`,
          );
        },
      },
    });
  }

  async handle_issue_comment() {
    core.info(
      `🤖 Checking commands in the issue (#${this.issue?.number}) comments"`,
    );

    if (!this.token) {
      return core.setFailed(
        `🚫 Missing required input "token", received "${this.token}"`,
      );
    }

    const requiredLabel = core.getInput(INPUTS.REQUIRED_LABEL);

    if (requiredLabel) {
      const hasLabel = this.issue?.labels?.find(
        (label: { name: string }) => label.name === requiredLabel,
      );

      if (!hasLabel) {
        // TODO: post a comment?
        return core.setFailed(
          `🚫 Missing required label: "${core.getInput(
            'required_label',
          )}" not found in issue #${this.issue?.number}.`,
        );
      }
    }

    const selfAssignCmd = core.getInput(INPUTS.SELF_ASSIGN_CMD);
    const selfUnassignCmd = core.getInput(INPUTS.SELF_UNASSIGN_CMD);
    const assignCommenterCmd = core.getInput(INPUTS.ASSIGN_USER_CMD);
    const unassignCommenterCmd = core.getInput(INPUTS.UNASSIGN_USER_CMD);
    const enableAutoSuggestion = core.getBooleanInput(
      INPUTS.ENABLE_AUTO_SUGGESTION,
    );
    const maintainersInput = core.getInput(INPUTS.MAINTAINERS);
    const maintainers = maintainersInput.split(',');

    const rawBody = this.context.payload.comment?.body as string;
    // Normalize command: replace leading backslash with slash
    const body = rawBody.replace(/^\\/, '/').toLowerCase();

    // Ignore quoted replies or maintainers using self-assignment commands
    if (
      body.trim().startsWith('>') ||
      (maintainers.includes(this.comment?.user?.login) &&
        (body.includes(selfAssignCmd) || body.includes(selfUnassignCmd)))
    ) {
      core.info(
        `🤖 Ignoring comment because it's either a quoted reply or a maintainer using self-assignment commands`,
      );
      return;
    }

    // Handle auto-suggestion first
    if (
      enableAutoSuggestion &&
      this._contribution_phrases().some((phrase) =>
        body.toLowerCase().includes(phrase.toLowerCase()),
      )
    ) {
      core.info(`🤖 Comment indicates interest in contribution: ${body}`);
      return this.$_handle_assignment_interest();
    }

    // Handle self-assignment commands (available to all users)
    if (body === selfAssignCmd || body.includes(selfAssignCmd)) {
      return this.$_handle_self_assignment();
    }

    if (body === selfUnassignCmd || body.includes(selfUnassignCmd)) {
      return this.$_handle_self_unassignment();
    }

    // Handle maintainer-only commands
    if (
      body.includes(assignCommenterCmd) ||
      body.includes(unassignCommenterCmd)
    ) {
      if (!maintainersInput) {
        return core.info(
          `🤖 Ignoring maintainer command because the "maintainers" input is empty`,
        );
      }

      const resolvedMaintainers =
        await this._resolve_maintainers(maintainersInput);

      if (!resolvedMaintainers.includes(this.comment?.user?.login)) {
        return core.info(
          `🤖 Ignoring maintainer command because user @${this.comment?.user?.login} is not in the maintainers list`,
        );
      }

      if (body.includes(assignCommenterCmd)) {
        return this.$_handle_user_assignment(assignCommenterCmd);
      }

      return this.$_handle_user_unassignment(unassignCommenterCmd);
    }

    return core.info(
      `🤖 Ignoring comment: ${this.context.payload.comment?.id} because it does not contain a supported command.`,
    );
  }

  private async _resolve_maintainers(
    maintainersInput: string,
  ): Promise<string[]> {
    const maintainers = maintainersInput
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    const resolvedMaintainers = new Set<string>();

    for (const maintainer of maintainers) {
      if (maintainer.startsWith('@') && maintainer.includes('/')) {
        const [org, team] = maintainer.substring(1).split('/');
        const members = await this._get_team_members(org, team);
        members.forEach((m) => resolvedMaintainers.add(m));
      } else {
        resolvedMaintainers.add(maintainer);
      }
    }

    return Array.from(resolvedMaintainers);
  }

  private async _get_team_members(
    org: string,
    team_slug: string,
  ): Promise<string[]> {
    try {
      const response = await this.octokit.request(
        'GET /orgs/{org}/teams/{team_slug}/members',
        {
          org,
          team_slug,
        },
      );
      return response.data.map((m: any) => m.login);
    } catch (error) {
      core.warning(
        `Failed to fetch members for team @${org}/${team_slug}. Ensure the token has read:org permissions. Error: ${error}`,
      );
      return [];
    }
  }

  private _is_issue_pinned(): boolean {
    const pinLabel = core.getInput(INPUTS.PIN_LABEL);
    return (
      this.issue?.labels?.some(
        (label: { name: string }) => label.name === pinLabel,
      ) || false
    );
  }

  private async $_handle_assignment_interest() {
    const daysUntilUnassign = Number(core.getInput(INPUTS.DAYS_UNTIL_UNASSIGN));

    if (this.issue?.assignee || (this.issue?.assignees?.length || 0) > 0) {
      // Check if the issue is pinned
      const isPinned = this._is_issue_pinned();

      const commentTemplate = isPinned
        ? INPUTS.ALREADY_ASSIGNED_COMMENT_PINNED
        : INPUTS.ALREADY_ASSIGNED_COMMENT;

      await this._create_comment<AlreadyAssignedCommentArg>(commentTemplate, {
        total_days: String(daysUntilUnassign),
        handle: this.comment?.user?.login,
        assignee: this.issue?.assignee?.login,
      });
      core.setOutput('assigned', 'no');
      return core.info(
        `🤖 Issue #${this.issue?.number} is already assigned to @${this.issue?.assignee?.login}`,
      );
    }

    return this._create_comment<AssignmentInterestCommentArg>(
      INPUTS.ASSIGNMENT_SUGGESTION_COMMENT,
      {
        handle: this.comment?.user?.login,
        trigger: core.getInput(INPUTS.SELF_ASSIGN_CMD),
      },
    );
  }

  private async $_handle_self_assignment() {
    core.info(
      `🤖 Starting assignment for issue #${this.issue?.number} in repo "${this.context.repo.owner}/${this.context.repo.repo}"`,
    );

    const daysUntilUnassign = Number(core.getInput(INPUTS.DAYS_UNTIL_UNASSIGN));
    const blockAssignment = core.getInput('block_assignment');

    // Check if user was previously unassigned
    const comments = await this.octokit.request(
      'GET /repos/{owner}/{repo}/issues/{issue_number}/comments',
      {
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        issue_number: Number(this.issue?.number),
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );

    const unassignCmd = core.getInput(INPUTS.UNASSIGN_USER_CMD);
    const unassignedComment = core.getInput(INPUTS.UNASSIGNED_COMMENT);
    const userHandle = this.comment?.user?.login;

    const wasUnassigned = comments.data.some((comment) => {
      const hasManualUnassign = comment.body?.includes(
        `${unassignCmd} @${userHandle}`,
      );
      const hasAutoUnassign = comment.body?.includes(
        mustache.render(unassignedComment, { handle: userHandle }),
      );
      return hasManualUnassign || hasAutoUnassign;
    });

    if (blockAssignment === 'true' && wasUnassigned) {
      await this._create_comment(INPUTS.BLOCK_ASSIGNMENT_COMMENT, {
        handle: this.comment?.user?.login,
      });
      core.setOutput('assigned', 'no');
      return core.info(
        `🤖 User @${this.comment?.user?.login} was previously unassigned from issue #${this.issue?.number}`,
      );
    }

    if (this.issue?.assignee) {
      // Check if the issue is pinned
      const isPinned = this._is_issue_pinned();

      const commentTemplate = isPinned
        ? INPUTS.ALREADY_ASSIGNED_COMMENT_PINNED
        : INPUTS.ALREADY_ASSIGNED_COMMENT;

      await this._create_comment<AlreadyAssignedCommentArg>(commentTemplate, {
        total_days: String(daysUntilUnassign),
        handle: this.comment?.user?.login,
        assignee: this.issue?.assignee?.login,
      });
      core.setOutput('assigned', 'no');
      return core.info(
        `🤖 Issue #${this.issue?.number} is already assigned to @${this.issue?.assignee?.login}`,
      );
    }

    // First, check the new per-label assignment limit
    const overallLabelsRaw = core.getInput(
      INPUTS.MAX_OVERALL_ASSIGNMENT_LABELS,
    );
    const overallCountLimit = parseInt(
      core.getInput(INPUTS.MAX_OVERALL_ASSIGNMENT_COUNT) || '0',
    );

    if (overallLabelsRaw && overallCountLimit > 0) {
      // Get the current issue's labels
      const currentIssueLabels =
        this.issue?.labels?.map((l: string | { name: string }) =>
          typeof l === 'string' ? l : l.name,
        ) || [];

      // Get configured labels to track
      const trackedLabels = overallLabelsRaw
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);

      // Find which tracked labels are on this issue
      const matchingLabels = currentIssueLabels.filter((label: string) =>
        trackedLabels.includes(label),
      );

      if (matchingLabels.length > 0) {
        // Get assignment counts for all tracked labels
        const labelCounts =
          await this._get_assignment_count_per_label(overallLabelsRaw);

        // Check if user has reached limit for any of the current issue's labels
        for (const label of matchingLabels) {
          const count = labelCounts.get(label) || 0;
          if (count >= overallCountLimit) {
            await this._create_comment(INPUTS.MAX_OVERALL_ASSIGNMENT_MESSAGE, {
              handle: this.comment?.user?.login,
              max_overall_assignment_count: overallCountLimit.toString(),
              label,
            });

            core.setOutput('assigned', 'no');
            return core.info(
              `🤖 User @${this.comment?.user?.login} has reached the assignment limit for label "${label}" (${count}/${overallCountLimit})`,
            );
          }
        }
      }
    }

    // Check assignment count limit before assigning
    const maxAssignments = parseInt(
      core.getInput(INPUTS.MAX_ASSIGNMENTS) || '3',
    );
    const assignmentCount = await this._get_assignment_count();

    if (assignmentCount >= maxAssignments) {
      await this._create_comment(INPUTS.MAX_ASSIGNMENTS_MESSAGE, {
        handle: this.comment?.user?.login,
        max_assignments: maxAssignments.toString(),
      });

      core.setOutput('assigned', 'no');
      return core.info(
        `🤖 User @${this.comment?.user?.login} has reached the maximum number of assignments (${maxAssignments})`,
      );
    }

    core.info(
      `🤖 Assigning @${this.comment?.user?.login} to issue #${this.issue?.number}`,
    );
    core.info(`🤖 Adding comment to issue #${this.issue?.number}`);

    await Promise.all([
      this._add_assignee(),
      this._create_comment<AssignUserCommentArg>(INPUTS.ASSIGNED_COMMENT, {
        total_days: daysUntilUnassign,
        unassigned_date: format(
          add(new Date(), { days: daysUntilUnassign }),
          'dd LLLL y',
        ),
        handle: this.comment?.user?.login,
        pin_label: core.getInput(INPUTS.PIN_LABEL),
      }),
    ]);

    core.info(`🤖 Issue #${this.issue?.number} assigned!`);
    return core.setOutput('assigned', 'yes');
  }

  private async $_handle_self_unassignment() {
    core.info(
      `🤖 Starting issue #${this.issue?.number} unassignment for user @${this.issue?.assignee.login} in repo "${this.context.repo.owner}/${this.context.repo.repo}"`,
    );

    if (this.issue?.assignee?.login === this.comment?.user?.login) {
      await Promise.all([
        this._remove_assignee(),
        this._create_comment<UnAssignUserCommentArg>(
          INPUTS.UNASSIGNED_COMMENT,
          {
            handle: this.comment?.user?.login,
            pin_label: core.getInput(INPUTS.PIN_LABEL),
          },
        ),
      ]);

      core.info(`🤖 Done issue unassignment!`);
      core.setOutput('unassigned', 'yes');
      core.setOutput('unassigned_issues', [this.issue?.number]);
      return;
    }

    core.setOutput('unassigned', 'no');
    core.setOutput('unassigned_issues', []);
    return core.info(
      `🤖 Commenter is different from the assignee, ignoring...`,
    );
  }

  private async $_handle_user_assignment(input: string) {
    core.info(`Starting issue assignment to user`);

    const idx = this.comment?.body.indexOf(input);
    if (idx !== -1) {
      const afterAssignCmd = this.comment?.body
        ?.slice(idx + input.length)
        .trim();

      const userHandleMatch = afterAssignCmd.match(/@([a-zA-Z0-9-]{1,39})/);
      if (userHandleMatch && userHandleMatch[1]) {
        const userHandle = userHandleMatch[1] as string;

        core.info(
          `🤖 Assigning @${userHandle} to issue #${this.issue?.number}`,
        );

        const daysUntilUnassign = Number(
          core.getInput(INPUTS.DAYS_UNTIL_UNASSIGN),
        );

        await Promise.all([
          this.octokit.request(
            'POST /repos/{owner}/{repo}/issues/{issue_number}/assignees',
            {
              owner: this.context.repo.owner,
              repo: this.context.repo.repo,
              issue_number: Number(this.issue?.number),
              assignees: [userHandle.trim()],
              headers: {
                'X-GitHub-Api-Version': '2022-11-28',
              },
            },
          ),
          this.octokit.request(
            'POST /repos/{owner}/{repo}/issues/{issue_number}/labels',
            {
              owner: this.context.repo.owner,
              repo: this.context.repo.repo,
              issue_number: Number(this.issue?.number),
              labels: [core.getInput(INPUTS.ASSIGNED_LABEL)],
              headers: {
                'X-GitHub-Api-Version': '2022-11-28',
              },
            },
          ),
          this._create_comment<AssignUserCommentArg>(INPUTS.ASSIGNED_COMMENT, {
            total_days: daysUntilUnassign,
            unassigned_date: format(
              add(new Date(), { days: daysUntilUnassign }),
              'dd LLLL y',
            ),
            handle: userHandle,
            pin_label: core.getInput(INPUTS.PIN_LABEL),
          }),
        ]);

        core.info(`🤖 Issue #${this.issue?.number} assigned!`);
        return core.setOutput('assigned', 'yes');
      } else {
        core.info(`No valid user handle found after /assign command`);
        return core.setOutput('assigned', 'no');
        // TODO: add a comment?
      }
    }
  }

  private async $_handle_user_unassignment(input: string) {
    core.info(`Starting issue unassignment to user`);

    const idx = this.comment?.body.indexOf(input);
    if (idx !== -1) {
      const afterAssignCmd = this.comment?.body
        ?.slice(idx + input.length)
        .trim();

      const userHandleMatch = afterAssignCmd.match(/@([a-zA-Z0-9-]{1,39})/);

      if (userHandleMatch && userHandleMatch[1]) {
        const userHandle = userHandleMatch[1];

        if (this.issue?.assignee?.login === userHandle) {
          await this._remove_assignee();
          core.setOutput('unassigned', 'yes');
          core.setOutput('unassigned_issues', [this.issue?.number]);
          return core.info(
            `🤖 User @${userHandle} is unassigned from the issue #${this.issue?.number}`,
          );
        }

        // TODO: post a comment to the issue
        core.setOutput('unassigned', 'no');
        core.setOutput('unassigned_issues', []);
        return core.info(
          `🤖 User @${userHandle} is not assigned to the issue #${this.issue?.number}`,
        );
      } else {
        // TODO: add a comment?
        core.setOutput('unassigned', 'no');
        core.setOutput('unassigned_issues', []);
        return core.info(`No valid user handle found after /assign command`);
      }
    }
  }

  private _add_assignee() {
    return Promise.all([
      this.octokit.request(
        'POST /repos/{owner}/{repo}/issues/{issue_number}/assignees',
        {
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          issue_number: Number(this.issue?.number),
          assignees: [this.comment?.user.login],
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      ),
      this.octokit.request(
        'POST /repos/{owner}/{repo}/issues/{issue_number}/labels',
        {
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          issue_number: Number(this.issue?.number),
          labels: [core.getInput(INPUTS.ASSIGNED_LABEL)],
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      ),
    ]);
  }

  private _remove_assignee() {
    return Promise.allSettled([
      this.octokit.request(
        'DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees',
        {
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          issue_number: Number(this.issue?.number),
          assignees: [this.issue?.assignee!.login],
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
          issue_number: Number(this.issue?.number),
          name: core.getInput(INPUTS.ASSIGNED_LABEL),
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
          issue_number: Number(this.issue?.number),
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
          issue_number: Number(this.issue?.number),
          name: '🔔 reminder-sent',
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      ),
    ]);
  }

  //! this should calculate how many times is left before the current
  //! assignee get unassign by the action
  // private async _already_assigned_comment(totalDays: number) {
  //   const comments = await this.client.rest.issues.listComments({
  //     ...this.context.repo,
  //     issue_number: this.issue?.number!,
  //   });

  //   // TODO: should return the comments made by the assigned user to search which one contains the cmd
  //   const assignedComment = comments.data.find(
  //     (comment) => comment.user!.login === this.issue?.assignee?.login,
  //   );

  //   if (!assignedComment) {
  //     // TODO: maybe post a comment here?
  //     return core.info(
  //       `🤖 Issue #${this.issue?.number} is already assigned to @${this.issue?.assignee?.login}`,
  //     );
  //   }

  //   const daysUntilUnassign = formatDistanceStrict(
  //     new Date(assignedComment?.created_at),
  //     add(new Date(assignedComment.created_at), { days: totalDays }),
  //   );

  //   await this._create_comment<AlreadyAssignedCommentArg>(
  //     INPUTS.ALREADY_ASSIGNED_COMMENT,
  //     {
  //       unassigned_date: daysUntilUnassign,
  //       handle: this.comment?.user?.login,
  //       assignee: this.issue?.assignee?.login,
  //     },
  //   );
  // }

  private _create_comment<T>(input: INPUTS, options: T) {
    const body = mustache.render(core.getInput(input), options);

    return this.octokit.request(
      'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
      {
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        issue_number: Number(this.issue?.number),
        body,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
  }

  private async _get_assignment_count(): Promise<number> {
    const { owner, repo } = this.context.repo;

    const query = [
      `repo:${owner}/${repo}`,
      'is:issue',
      'is:open',
      `assignee:${this.comment?.user?.login}`,
    ];

    const issues = await this.octokit.request(`GET /search/issues`, {
      advanced_search: true,
      q: query.join(' '),
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    return issues.data.items.length;
  }

  /**
   * Count issues (open or closed) assigned to the current commenter for each label.
   * `labelsRaw` is a comma-separated list of label names.
   * Returns a Map of label -> count of issues with that label.
   */
  private async _get_assignment_count_per_label(
    labelsRaw: string,
  ): Promise<Map<string, number>> {
    const { owner, repo } = this.context.repo;
    const labels = labelsRaw
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);

    const labelCounts = new Map<string, number>();

    if (labels.length === 0) return labelCounts;

    const baseQuery = [
      `repo:${owner}/${repo}`,
      'is:issue',
      `assignee:${this.comment?.user?.login}`,
    ];

    for (const label of labels) {
      const q = [...baseQuery, `label:"${label}"`].join(' ');
      const issues = await this.octokit.request(`GET /search/issues`, {
        advanced_search: true,
        q,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      labelCounts.set(label, issues.data.total_count || 0);
    }

    return labelCounts;
  }

  private _contribution_phrases() {
    return [
      'asssign-me',
      'Assign this issue to me',
      'Assign it to me',
      'Assign to me',
      'Assign me',
      'Assign me this issue',
      'Assign this for me',
      'Available to work on',
      'Can I be assigned to this issue',
      'can I kindly work on this issue',
      'Can I take on this issue',
      'Can I take this issue',
      'Can I take up this issue',
      'Can I work on it',
      'Could I get assigned',
      "I'd like to be assigned to",
      "I'm keen to have a go",
      'I am here to do a university assignment',
      'I am interested in taking on this issue',
      'I am interested in the issue',
      'I am very interested in this issue',
      'I hope to contribute to this issue',
      'I would like to work on this issue',
      'Interested to work',
      'is this free to take',
      'May I do this feature',
      'May I take it',
      'May I work on this issue',
      'Please assign',
      'Still open for contribution',
      'Want to take this issue',
      'Want to contribute',
      'Would be happy to pick this up',
      'Would like to work on this',
      'Would like to contribute',
      'Would love to work on this issue',
    ];
  }
}
