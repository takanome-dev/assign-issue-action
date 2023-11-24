import mustache from 'mustache';
import { context, getOctokit } from '@actions/github';
import { getInput, info, setFailed } from '@actions/core';

import type { WebhookPayload } from '@actions/github/lib/interfaces';

import helpers from './helpers';
import { Issue, Comment as IComment } from '../types';

export default class Comment {
  private issue: WebhookPayload['issue'] | Issue;
  private comment: WebhookPayload['comment'] | IComment;
  private token: string;
  private context = context;
  private client: ReturnType<typeof getOctokit>;

  constructor() {
    this.issue = this.context.payload.issue;
    this.comment = this.context.payload.comment;
    this.token = getInput('github_token');
    this.client = getOctokit(this.token);
  }

  public async handleAssignIssue() {
    info(`🤖 Starting issue assignment...`);

    const trigger = getInput('trigger');
    const isTriggered = this.context.payload.comment?.body?.includes(trigger);

    if (!isTriggered) {
      return info(`🤖 Ignoring comment: ${this.context.payload.comment?.body}`);
    }

    if (!this.token)
      return setFailed(`🚫 Missing required input: token = ${this.token}`);

    const requiredLabel = getInput('required_label');

    if (requiredLabel) {
      // Check if the issue has the required label
      const hasLabel = this.issue?.labels?.find(
        (label: { name: string }) => label.name === requiredLabel,
      );

      if (!hasLabel)
        return setFailed(
          `🚫 Missing required label: "[${getInput(
            'required_label',
          )}]" label not found in issue #${this.issue?.number}.`,
        );
    }

    const totalDays = Number(getInput('days_until_unassign'));

    // Check if the issue is already assigned
    if (this.issue?.assignee) {
      await this.issueAssignedComment(totalDays);
      return info(
        `🤖 Issue #${this.issue?.number} is already assigned to @${this.issue?.assignee?.login}`,
      );
    }

    info(
      `🤖 Assigning @${this.comment?.user?.login} to issue #${this.issue?.number}`,
    );

    // Assign the issue to the user and add label "assigned_label"
    await this.addAssignee();

    // Add a comment to the issue
    info(`🤖 Adding comment to issue #${this.issue?.number}`);

    const options = {
      totalDays,
      comment: this.comment,
      // eslint-disable-next-line no-undef
      env: process.env,
      inputs: helpers.getInputs(),
    };

    await this.createComment('assigned_comment', options);
    info(`🤖 Issue #${this.issue?.number} assigned!`);
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
        labels: [getInput('assigned_label')],
      }),
    ]);
  }

  private async createComment(inputName: string, options: unknown) {
    const body = mustache.render(getInput(inputName), options);

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
      return info(
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
