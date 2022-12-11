import mustache from 'mustache';
import { WebhookPayload } from '@actions/github/lib/interfaces';
import { Core, Github } from '../index';
import helpers from './helpers';

export default class Comment {
  private issue: WebhookPayload['issue'];
  private comment: WebhookPayload['comment'];
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
    if (!this.token)
      return this.core.setFailed(
        `🚫 Missing required input: token = ${this.token}`
      );

    await this.checkRequiredLabel();

    await this.checkAssignee();

    this.core.info(
      `🤖 Assigning @${this.comment?.user?.login} to #${this.issue?.number}`
    );

    // Assign the issue to the user and add label "assigned_label"
    await this.addAssignee();

    const totalDays = Number(this.core.getInput('days_until_unassign'));

    const options = {
      totalDays,
      comment: this.comment,
      // eslint-disable-next-line no-undef
      env: process.env,
      inputs: helpers.getInputs(),
    };

    await this.createComment('assigned_comment', options);
  }

  private async checkAssignee() {
    if (this.issue?.assignee) {
      return await this.createComment('already_assigned_comment', {
        totalDays: Number(this.core.getInput('day_until_unassign')),
      });
    }
  }

  private async checkRequiredLabel() {
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
}
