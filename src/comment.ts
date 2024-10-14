import * as core from '@actions/core';
import mustache from 'mustache';
import { context, getOctokit } from '@actions/github';

import type { WebhookPayload } from '@actions/github/lib/interfaces';
import type { Issue, Comment as IComment } from './types';

import { INPUTS } from './utils/lib/inputs';
import { getInputs } from './utils/helpers/get-inputs';

export default class Comment {
  private issue: WebhookPayload['issue'] | Issue;
  private comment: WebhookPayload['comment'] | IComment;
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
      // TODO: handle self assign
    }

    if (body.includes(selfUnassignCmd)) {
      // TODO: handle self unassign
    }

    if (body.includes(assignCommenterCmd)) {
      // TODO: handle assign commenter
    }

    if (body.includes(unassignCommenterCmd)) {
      // TODO: handle unassign commenter
    }

    return core.info(
      `🤖 Ignoring comment: ${this.context.payload.comment?.id} because it does not contain a supported command.`,
    );
  }

  public async handleAssignIssue() {
    core.info(
      `🤖 Starting assignment for issue #${this.issue?.number} in repo "${this.context.repo.owner}/${this.context.repo.repo}"`,
    );

    const requiredLabel = core.getInput(INPUTS.REQUIRED_LABEL);

    if (requiredLabel) {
      // Check if the issue has the required label
      const hasLabel = this.issue?.labels?.find(
        (label: { name: string }) => label.name === requiredLabel,
      );

      if (!hasLabel)
        return core.setFailed(
          `🚫 Missing required label: "${core.getInput(
            'required_label',
          )}" not found in issue #${this.issue?.number}.`,
        );
    }

    const totalDays = Number(core.getInput(INPUTS.DAYS_UNTIL_UNASSIGN));

    // Check if the issue is already assigned
    if (this.issue?.assignee) {
      await this.issueAssignedComment(totalDays);
      return core.info(
        `🤖 Issue #${this.issue?.number} is already assigned to @${this.issue?.assignee?.login}`,
      );
    }

    core.info(
      `🤖 Assigning @${this.comment?.user?.login} to issue #${this.issue?.number}`,
    );

    // Assign the issue to the user and add label "assigned_label"
    await this.addAssignee();

    // Add a comment to the issue
    core.info(`🤖 Adding comment to issue #${this.issue?.number}`);

    const options = {
      totalDays,
      comment: this.comment,
      // eslint-disable-next-line no-undef
      env: process.env,
      inputs: getInputs(),
    };

    await this.createComment('assigned_comment', options);
    core.info(`🤖 Issue #${this.issue?.number} assigned!`);
  }

  private async addAssignee() {
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

  private async createComment(inputName: string, options: unknown) {
    const body = mustache.render(core.getInput(inputName), options);

    await this.client.rest.issues.createComment({
      ...this.context.repo,
      issue_number: this.issue?.number as number,
      body,
    });
  }

  private async issueAssignedComment(totalDays: number) {
    const comments = await this.client.rest.issues.listComments({
      ...this.context.repo,
      issue_number: this.issue?.number!,
    });

    const assignedComment = comments.data.find(
      (comment) => comment.user!.login === this.issue?.assignee?.login,
    );

    if (!assignedComment) {
      return core.info(
        `🤖 Issue #${this.issue?.number} is already assigned to @${this.issue?.assignee?.login}`,
      );
    }

    const daysUntilUnassign = this.calculateDaysUntilUnassign(
      assignedComment?.created_at,
      totalDays,
    );

    await this.createComment('already_assigned_comment', {
      daysUntilUnassign,
      comment: this.comment,
      assignee: this.issue?.assignee,
    });
  }

  private calculateDaysUntilUnassign(createAt: string, totalDays: number) {
    const createdAt = new Date(createAt);
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate.getTime() - createdAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return totalDays - diffDays;
  }
}
