import mustache from 'mustache';
import { Core, Github } from '../index';
import helpers from './helpers';
import { WebhookPayload } from '@actions/github/lib/interfaces';
import { Issue, Comment as IComment } from '../types';

export default class Comment {
  private issue: WebhookPayload['issue'] | Issue;
  private comment: WebhookPayload['comment'] | IComment;
  private token: string;
  private core: Core;
  private github: Github;
  private client: ReturnType<Github['getOctokit']>;

  constructor(core: Core, github: Github) {
    this.issue = github.context.payload.issue;
    this.comment = github.context.payload.comment;
    this.token = core.getInput('github_token');
    this.core = core;
    this.github = github;
    this.client = this.github.getOctokit(this.token);
  }

  public async handleAssignIssue() {
    this.core.info(`🤖 Starting issue assignment...`);
    this.core.info(`🤖 GITHUB_TOKEN: ${this.token}`);

    const trigger = this.core.getInput('trigger');
    const isTriggered =
      this.github.context.payload.comment?.body?.includes(trigger);

    if (!isTriggered) {
      return this.core.info(
        `🤖 Ignoring comment: ${this.github.context.payload.comment?.body}`
      );
    }

    // this.token = this.core.getInput('github_token');
    // this.client = this.github.getOctokit(this.token);

    if (!this.token)
      return this.core.setFailed(
        `🚫 Missing required input: token = ${this.token}`
      );

    const requiredLabel = this.core.getInput('required_label');

    if (requiredLabel) {
      // Check if the issue has the required label
      const hasLabel = this.issue?.labels?.find(
        (label: { name: string }) => label.name === requiredLabel
      );

      if (!hasLabel)
        return this.core.setFailed(
          `🚫 Missing required label: "[${this.core.getInput(
            'required_label'
          )}]" label not found in issue #${this.issue?.number}.`
        );
    }

    const totalDays = Number(this.core.getInput('days_until_unassign'));

    // Check if the issue is already assigned
    if (this.issue?.assignee) {
      await this.issueAssignedComment(totalDays);
      return this.core.info(
        `🤖 Issue #${this.issue?.number} is already assigned to @${this.issue?.assignee?.login}`
      );
    }

    this.core.info(
      `🤖 Assigning @${this.comment?.user?.login} to issue #${this.issue?.number}`
    );

    // Assign the issue to the user and add label "assigned_label"
    await this.addAssignee();

    // Add a comment to the issue
    this.core.info(`🤖 Adding comment to issue #${this.issue?.number}`);

    const options = {
      totalDays,
      comment: this.comment,
      // eslint-disable-next-line no-undef
      env: process.env,
      inputs: helpers.getInputs(),
    };

    await this.createComment('assigned_comment', options);
    this.core.info(`🤖 Issue #${this.issue?.number} assigned!`);
  }

  private async addAssignee() {
    await Promise.all([
      await this.client.rest.issues.addAssignees({
        ...this.github.context.repo,
        issue_number: this.issue?.number!,
        assignees: [this.comment?.user.login],
      }),
      await this.client.rest.issues.addLabels({
        ...this.github.context.repo,
        issue_number: this.issue?.number!,
        labels: [this.core.getInput('assigned_label')],
      }),
    ]);
  }

  private async createComment(inputName: string, options: unknown) {
    const body = mustache.render(this.core.getInput(inputName), options);

    await this.client.rest.issues.createComment({
      ...this.github.context.repo,
      issue_number: this.issue?.number as number,
      body,
    });
  }

  private async issueAssignedComment(totalDays: number) {
    const comments = await this.client.rest.issues.listComments({
      ...this.github.context.repo,
      issue_number: this.issue?.number!,
    });

    const assignedComment = comments.data.find(
      (comment) => comment.user!.login === this.issue?.assignee?.login
    );

    if (!assignedComment) {
      return this.core.info(
        `🤖 Issue #${this.issue?.number} is already assigned to @${this.issue?.assignee?.login}`
      );
    }

    const daysUntilUnassign = this.calculateDaysUntilUnassign(
      assignedComment?.created_at,
      totalDays
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
