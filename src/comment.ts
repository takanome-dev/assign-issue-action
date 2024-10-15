import * as core from '@actions/core';
import mustache from 'mustache';
import { context, getOctokit } from '@actions/github';

import type { WebhookPayload } from '@actions/github/lib/interfaces';
import type { GhIssue, GhComment } from './types';
import type {
  AlreadyAssignedCommentArg,
  AssignUserCommentArg,
  UnAssignUserCommentArg,
} from './types/comment';

import { INPUTS } from './utils/lib/inputs';
// import { getInputs } from './utils/helpers/get-inputs';
import { add, formatDistanceStrict } from 'date-fns';

export default class Comment {
  private issue: WebhookPayload['issue'] | GhIssue;
  private comment: WebhookPayload['comment'] | GhComment;
  private token: string;
  private context = context;
  private client: ReturnType<typeof getOctokit>;

  constructor() {
    this.issue = this.context.payload.issue;
    this.comment = this.context.payload.comment;
    this.token = core.getInput(INPUTS.GITHUB_TOKEN);
    this.client = getOctokit(this.token);
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

    const selfAssignCmd = core.getInput(INPUTS.SELF_ASSIGN_CMD);
    const selfUnassignCmd = core.getInput(INPUTS.SELF_UNASSIGN_CMD);
    const assignCommenterCmd = core.getInput(INPUTS.ASSIGN_COMMENTER_CMD);
    const unassignCommenterCmd = core.getInput(INPUTS.UNASSIGN_COMMENTER_CMD);

    const body = this.context.payload.comment?.body as string;

    if (body.includes(selfAssignCmd)) {
      return this.$_handle_self_assignment();
    }

    if (body.includes(selfUnassignCmd)) {
      return this.$_handle_self_unassignment();
    }

    if (body.includes(assignCommenterCmd)) {
      // TODO: handle assign commenter
    }

    if (body.includes(unassignCommenterCmd)) {
      // TODO: handle unassign commenter
    }

    // TODO: have an input where I can determise if I should comment a info msg with the cmd available
    // or just ignore it

    return core.info(
      `🤖 Ignoring comment: ${this.context.payload.comment?.id} because it does not contain a supported command.`,
    );
  }

  private async $_handle_self_assignment() {
    core.info(
      `🤖 Starting assignment for issue #${this.issue?.number} in repo "${this.context.repo.owner}/${this.context.repo.repo}"`,
    );

    // TODO: maybe move this to "handle_issue_comment"
    const requiredLabel = core.getInput(INPUTS.REQUIRED_LABEL);

    if (requiredLabel) {
      const hasLabel = this.issue?.labels?.find(
        (label: { name: string }) => label.name === requiredLabel,
      );

      if (!hasLabel)
        // TODO: post a comment
        return core.setFailed(
          `🚫 Missing required label: "${core.getInput(
            'required_label',
          )}" not found in issue #${this.issue?.number}.`,
        );
    }

    const daysUntilUnassign = Number(core.getInput(INPUTS.DAYS_UNTIL_UNASSIGN));

    if (this.issue?.assignee) {
      await this._already_assigned_comment(daysUntilUnassign);
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
      await this._create_comment<AssignUserCommentArg>(
        INPUTS.ASSIGNED_COMMENT,
        {
          totalDays: daysUntilUnassign,
          unassigned_date: add(new Date(), { days: daysUntilUnassign }),
          comment: this.comment as GhComment,
        },
      ),
    ]);

    core.info(`🤖 Issue #${this.issue?.number} assigned!`);
  }

  private async $_handle_self_unassignment() {
    core.info(
      `🤖 Starting issue #${this.issue?.number} unassignment for user @${this.issue?.assignee.login} in repo "${this.context.repo.owner}/${this.context.repo.repo}"`,
    );

    if (this.issue?.assignee?.login === this.comment?.user?.login) {
      await Promise.all([
        this._remove_assignee(),
        await this._create_comment<UnAssignUserCommentArg>(
          INPUTS.UNASSIGNED_COMMENT,
          {
            comment: this.comment as GhComment,
          },
        ),
      ]);

      core.info(`🤖 Done issue unassignment!`);
    }

    return core.info(
      `🤖 Commenter is different from the assignee, ignoring...`,
    );
  }

  private async _add_assignee() {
    await Promise.all([
      await this.client.rest.issues.addAssignees({
        ...this.context.repo,
        issue_number: this.issue?.number!,
        assignees: [this.comment?.user.login],
      }),
      await this.client.rest.issues.addLabels({
        ...this.context.repo,
        issue_number: this.issue?.number!,
        labels: [core.getInput(INPUTS.ASSIGNED_LABEL)],
      }),
    ]);
  }

  private async _remove_assignee() {
    return Promise.all([
      await this.client.rest.issues.removeAssignees({
        ...this.context.repo,
        issue_number: this.issue?.number!,
        assignees: [this.issue?.assignee!.login],
      }),
      await this.client.rest.issues.removeLabel({
        ...this.context.repo,
        issue_number: this.issue?.number!,
        name: core.getInput(INPUTS.ASSIGNED_LABEL),
      }),
    ]);
  }

  private async _already_assigned_comment(totalDays: number) {
    const comments = await this.client.rest.issues.listComments({
      ...this.context.repo,
      issue_number: this.issue?.number!,
    });

    // TODO: should return the comments made by the assigned user to search which one contains the cmd
    const assignedComment = comments.data.find(
      (comment) => comment.user!.login === this.issue?.assignee?.login,
    );

    if (!assignedComment) {
      // TODO: maybe post a comment here?
      return core.info(
        `🤖 Issue #${this.issue?.number} is already assigned to @${this.issue?.assignee?.login}`,
      );
    }

    const daysUntilUnassign = formatDistanceStrict(
      new Date(assignedComment?.created_at),
      add(new Date(assignedComment.created_at), { days: totalDays }),
    );

    await this._create_comment<AlreadyAssignedCommentArg>(
      INPUTS.ALREADY_ASSIGNED_COMMENT,
      {
        unassigned_date: daysUntilUnassign,
        comment: this.comment as GhComment,
        assignee: this.issue?.assignee,
      },
    );
  }

  private async _create_comment<T>(input: INPUTS, options: T) {
    const body = mustache.render(core.getInput(input), options);

    await this.client.rest.issues.createComment({
      ...this.context.repo,
      issue_number: this.issue?.number as number,
      body,
    });
  }
}
