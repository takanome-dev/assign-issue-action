import * as core from '@actions/core';
import * as github from '@actions/github';

import Comment from '../src/lib/comment';
import helpers from '../src/lib/helpers';

jest.mock('@actions/core');
jest.mock('@actions/github');

function calculateDaysUntilUnassign(createAt: string, totalDays: number) {
  const createdAt = new Date(createAt);
  const currentDate = new Date();
  const diffTime = Math.abs(currentDate.getTime() - createdAt.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return totalDays - diffDays;
}

describe('🗨 Comment Handler', () => {
  let client: ReturnType<typeof github.getOctokit>;
  let commentHandler: Comment;

  beforeAll(() => {
    jest.spyOn(core, 'getInput').mockImplementation((name, options) => {
      return jest.requireActual('@actions/core').getInput(name, options);
    });
    jest.spyOn(core, 'setFailed').mockImplementation((message) => {
      return jest.requireActual('@actions/core').setFailed(message);
    });
    jest.spyOn(core, 'info').mockImplementation((message) => {
      return jest.requireActual('@actions/core').info(message);
    });

    client = github.getOctokit('_');
    commentHandler = new Comment(core, github);

    Object.assign(process.env, helpers.getDefaultValues());
  });

  beforeEach(() => {
    process.env.INPUT_GITHUB_TOKEN = 'token';
    process.env.INPUT_REQUIRED_LABEL = '';
    github.context.payload.comment!.body =
      "Hey, I'm interested in this issue. Can you /assign-me please?";
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should ignore the comment if it does not contain the trigger', async () => {
    github.context.payload.comment!.body = 'Hey, can you assign this to me?';
    await commentHandler.handleAssignIssue();
    expect(core.info).toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith(
      `🤖 Ignoring comment: ${github.context.payload.comment?.body}`
    );
  });

  it('should exit early if token is not provided', async () => {
    process.env.INPUT_GITHUB_TOKEN = '';
    await commentHandler.handleAssignIssue();
    expect(core.setFailed).toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenCalledWith(
      `🚫 Missing required input: token = ${process.env.INPUT_GITHUB_TOKEN}`
    );
  });

  it('should failed if required_label is provided but not in the issue', async () => {
    process.env.INPUT_REQUIRED_LABEL = 'Required';
    await commentHandler.handleAssignIssue();
    expect(core.setFailed).toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenCalledWith(
      `🚫 Missing required label: "[${process.env.INPUT_REQUIRED_LABEL}]" label not found in issue #${github.context.payload.issue?.number}.`
    );
  });

  it('should let the user know the issue is already assigned', async () => {
    const commenter = github.context.payload.comment!.user.login;
    const assignee = github.context.payload.issue!.assignee!.login;
    const daysUntilUnassign = calculateDaysUntilUnassign(
      github.context.payload.issue!.created_at,
      Number(process.env.INPUT_DAYS_UNTIL_UNASSIGN)
    );

    await commentHandler.handleAssignIssue();
    expect(client.rest.issues.listComments).toHaveBeenCalled();
    expect(client.rest.issues.listComments).toHaveBeenCalledWith({
      owner: 'TAKANOME-DEV',
      repo: 'test-action',
      issue_number: 1,
    });
    expect(client.rest.issues.createComment).toHaveBeenCalled();
    expect(client.rest.issues.createComment).toHaveBeenCalledWith({
      owner: 'TAKANOME-DEV',
      repo: 'test-action',
      issue_number: 1,
      body: `👋 Hey @${commenter}, this issue is already assigned to @${assignee}.

⚠️ It will become unassigned if it isn't closed within **${daysUntilUnassign} days**. 

🔧 A maintainer can also add you to the list of assignees or swap you with the current assignee.`,
    });
    expect(core.info).toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith(
      `🤖 Issue #${github.context.payload.issue?.number} is already assigned to @${assignee}`
    );
  });

  it('assign the user if there is no assignee', async () => {
    github.context.payload.issue!.assignee = null;
    await commentHandler.handleAssignIssue();

    expect(core.info).toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith(
      `🤖 Assigning @${github.context.payload.comment?.user.login} to issue #${github.context.payload.issue?.number}`
    );
    expect(client.rest.issues.addAssignees).toHaveBeenCalled();
    expect(client.rest.issues.addAssignees).toHaveBeenCalledWith({
      owner: 'TAKANOME-DEV',
      repo: 'test-action',
      issue_number: 1,
      assignees: ['john-doe'],
    });
  });

  it('add "Assigned" label if user is assigned', async () => {
    await commentHandler.handleAssignIssue();

    expect(core.info).toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith(
      `🤖 Assigning @${github.context.payload.comment?.user.login} to issue #${github.context.payload.issue?.number}`
    );
    expect(client.rest.issues.addLabels).toHaveBeenCalled();
    expect(client.rest.issues.addLabels).toHaveBeenCalledWith({
      owner: 'TAKANOME-DEV',
      repo: 'test-action',
      issue_number: 1,
      labels: ['📍 Assigned'],
    });
  });

  it('should create a comment', async () => {
    const commenter = github.context.payload.comment!.user.login;
    const totalDays = process.env.INPUT_DAYS_UNTIL_UNASSIGN;
    const pinnedLabel = process.env.INPUT_PIN_LABEL;

    await commentHandler.handleAssignIssue();
    expect(core.info).toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith(
      `🤖 Adding comment to issue #${github.context.payload.issue?.number}`
    );
    expect(client.rest.issues.createComment).toHaveBeenCalled();
    expect(client.rest.issues.createComment).toHaveBeenCalledWith({
      owner: 'TAKANOME-DEV',
      repo: 'test-action',
      issue_number: 1,
      body: `👋 Hey @${commenter}, thanks for your interest in this issue! 🎉

⚠ Note that this issue will become unassigned if it isn't closed within **${totalDays} days**.

🔧 A maintainer can also add the **${pinnedLabel}** label to prevent it from being unassigned automatically.`,
    });
    expect(core.info).toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith(
      `🤖 Issue #${github.context.payload.issue?.number} assigned!`
    );
  });
});
