/* eslint-disable import/no-unresolved */
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

  handle_issue_comment() {
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

    const body = (this.context.payload.comment?.body as string).toLowerCase();

    if (
      enableAutoSuggestion &&
      this._contribution_phrases().some((phrase) =>
        body.includes(phrase.toLowerCase()),
      )
    ) {
      core.info(`🤖 Comment indicates interest in contribution: ${body}`);
      return this.$_handle_assignment_interest();
    }

    if (body === selfAssignCmd) {
      return this.$_handle_self_assignment();
    }

    if (body === selfUnassignCmd) {
      return this.$_handle_self_unassignment();
    }

    if (maintainers.length > 0) {
      if (maintainers.includes(this.comment?.user?.login)) {
        if (body.startsWith(assignCommenterCmd)) {
          return this.$_handle_user_assignment(assignCommenterCmd);
        }

        if (body.startsWith(unassignCommenterCmd)) {
          return this.$_handle_user_unassignment(unassignCommenterCmd);
        }
      } else {
        return core.info(
          `🤖 Ignoring comment because the commenter is not in the list of maintainers specified in the config file`,
        );
      }
    } else {
      return core.info(
        `🤖 Ignoring comment because the "maintainers" input in the config file is empty`,
      );
    }

    return core.info(
      `🤖 Ignoring comment: ${this.context.payload.comment?.id} because it does not contain a supported command.`,
    );
  }

  private $_handle_assignment_interest() {
    return this._create_comment<AssignmentInterestCommentArg>(
      INPUTS.ASSIGNMENT_SUGGESTION_COMMENT,
      {
        handle: this.comment?.user?.login,
      },
    );
  }

  private async $_handle_self_assignment() {
    core.info(
      `🤖 Starting assignment for issue #${this.issue?.number} in repo "${this.context.repo.owner}/${this.context.repo.repo}"`,
    );

    const daysUntilUnassign = Number(core.getInput(INPUTS.DAYS_UNTIL_UNASSIGN));

    if (this.issue?.assignee) {
      // await this._already_assigned_comment(daysUntilUnassign);
      await this._create_comment<AlreadyAssignedCommentArg>(
        INPUTS.ALREADY_ASSIGNED_COMMENT,
        {
          unassigned_date: String(daysUntilUnassign),
          handle: this.comment?.user?.login,
          assignee: this.issue?.assignee?.login,
        },
      );
      core.setOutput('assigned', 'no');
      return core.info(
        `🤖 Issue #${this.issue?.number} is already assigned to @${this.issue?.assignee?.login}`,
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
          { handle: this.comment?.user?.login },
        ),
      ]);

      core.info(`🤖 Done issue unassignment!`);
      return core.setOutput('unassigned', 'yes');
    }

    core.setOutput('unassigned', 'no');
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

        //! not needed if we have list of allowed users who can use the command
        // if (this.issue?.assignee) {
        //   const template = `
        //   👋 Hey @{{ user }}, this issue is already assigned to @{{ assignee }}.
        //   You can contact a maintainer so that they can add you to the list of assignees or swap you with the current assignee.
        //   `;

        //   const body = mustache.render(template, {
        //     user: this.comment?.user.login,
        //     assignee: this.issue.assignee?.login,
        //   });

        //   await this.client.rest.issues.createComment({
        //     ...this.context.repo,
        //     issue_number: this.issue?.number as number,
        //     body,
        //   });
        //   return core.info(
        //     `🤖 Issue #${this.issue?.number} is already assigned to @${this.issue?.assignee?.login}`,
        //   );
        // }

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
              issue_number: this.issue?.number!,
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
              issue_number: this.issue?.number!,
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
          await Promise.all([
            this._remove_assignee(),
            this._create_comment<UnAssignUserCommentArg>(
              INPUTS.UNASSIGNED_COMMENT,
              { handle: userHandle },
            ),
          ]);

          core.setOutput('unassigned', 'yes');
          return core.info(
            `🤖 User @${userHandle} is unassigned from the issue #${this.issue?.number}`,
          );
        }

        // TODO: post a comment to the issue
        core.setOutput('unassigned', 'no');
        return core.info(
          `🤖 User @${userHandle} is not assigned to the issue #${this.issue?.number}`,
        );
      } else {
        // TODO: add a comment?
        core.setOutput('unassigned', 'no');
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
          issue_number: this.issue?.number!,
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
          issue_number: this.issue?.number!,
          labels: [core.getInput(INPUTS.ASSIGNED_LABEL)],
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      ),
    ]);
  }

  private _remove_assignee() {
    return Promise.all([
      this.octokit.request(
        'DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees',
        {
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          issue_number: this.issue?.number!,
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
          issue_number: this.issue?.number!,
          name: core.getInput(INPUTS.ASSIGNED_LABEL),
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
        issue_number: this.issue?.number!,
        body,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
  }

  private _contribution_phrases() {
    return [
      'Assign this issue to me',
      'I would like to work on this issue',
      'Can I take on this issue',
      'May I work on this issue',
      "I'm keen to have a go",
      'I am here to do a university assignment',
      'I hope to contribute to this issue',
      'Can I be assigned to this issue',
      'Is this issue available to work on',
      'I would be happy to pick this up',
      'I want to take this issue',
      'I have read through this issue and want to contribute',
      'Is this issue still open for contribution',
      'Hi, can I take this issue',
      'I would love to work on this issue',
      "Hey, I'd like to be assigned to this issue",
      'Please assign me to this issue',
    ];
  }
}
