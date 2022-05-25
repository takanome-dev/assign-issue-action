/* eslint-disable filenames/match-regex */
import * as core from '@actions/core';
import * as github from '@actions/github';
import commentHandler from '../src/lib/comment-handler';
import helpers from '../src/lib/helpers';

describe('command-handler', () => {
  let client: any;

  beforeAll(() => {
    jest.spyOn(core, 'setFailed');

    client = github.getOctokit('_');

    Object.assign(process.env, helpers.getDefaultValues());
  });

  beforeEach(() => {
    process.env.INPUT_GITHUB_TOKEN = 'token';
    process.env.INPUT_REQUIRED_LABEL = 'Not-Assigned';
    github.context.payload.issue!.labels = [{ name: 'Not-Assigned' }];
    github.context.payload.issue!.assignee = '';
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('exits early if token is not provided', async () => {
    process.env.INPUT_GITHUB_TOKEN = '';
    await commentHandler(core, github);
    expect(core.setFailed).toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenCalledWith(
      `Missing required input: token = `
    );
  });

  it('exits early if required_label is not provided', async () => {
    process.env.INPUT_REQUIRED_LABEL = '';
    await commentHandler(core, github);
    expect(core.setFailed).toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenCalledWith(
      `Missing required input: required_label = `
    );
  });

  it('exits early if required_label is set but not present', async () => {
    process.env.INPUT_REQUIRED_LABEL = 'Not-Assigned';
    github.context.payload.issue!.labels = [];
    await commentHandler(core, github);
    expect(core.setFailed).toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenCalledWith(
      'Required label: [Not-Assigned] label not found in issue #1.'
    );
  });

  it('exits early if the issue is already assigned', async () => {
    github.context.payload.issue!.assignee = 'Saladin';
    await commentHandler(core, github);
    expect(core.setFailed).toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenCalledWith(
      'Issue #1 is already assigned to @Saladin'
    );
  });

  it('assigns the user if every input is set', async () => {
    await commentHandler(core, github);
    expect(core.setFailed).toHaveBeenCalledTimes(4);
    expect(client.rest.issues.addAssignees).toHaveBeenCalled();
    expect(client.rest.issues.addAssignees).toHaveBeenCalledWith({
      owner: 'TAKANOME-DEV',
      repo: 'testing',
      issue_number: 1,
      assignees: ['John'],
    });
  });

  it('add "Is-Assigned" label if user is assigned', async () => {
    await commentHandler(core, github);
    expect(core.setFailed).toHaveBeenCalledTimes(4);
    expect(client.rest.issues.addLabels).toHaveBeenCalled();
    expect(client.rest.issues.addLabels).toHaveBeenCalledWith({
      owner: 'TAKANOME-DEV',
      repo: 'testing',
      issue_number: 1,
      labels: ['Is-Assigned'],
    });
  });

  it('uses a custom assigned_comment message', async () => {
    await commentHandler(core, github);
    expect(core.setFailed).toHaveBeenCalledTimes(4);
    expect(client.rest.issues.createComment).toHaveBeenCalled();
    expect(github.context.payload.comment).toMatchSnapshot();
  });
});
