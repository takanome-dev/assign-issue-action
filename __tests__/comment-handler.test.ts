/* eslint-disable filenames/match-regex */

import * as core from '@actions/core';
import * as github from '@actions/github';
import commentHandler from '../src/lib/comment-handler';
import helpers from '../src/lib/helpers';

// const gh = github.getOctokit('_');
// const addAssigneesMock = jest.spyOn(gh.rest.issues, 'addAssignees');
// const addLabelsMock = jest.spyOn(gh.rest.issues, 'addLabels');
// const createCommentMock = jest.spyOn(gh.rest.issues, 'createComment');

// const originalGitHubWorkspace = process.env['GITHUB_WORKSPACE'];

// Inputs for mock @actions/core
// let inputs = {} as any;

// Shallow clone original @actions/github context
// let originalContext = { ...github.context };

describe('command-handler', () => {
  beforeAll(() => {
    Object.assign(
      process.env,
      // {
      //   GITHUB_ACTION: 'my-action',
      //   GITHUB_ACTOR: 'TAKANOME-DEV',
      //   GITHUB_EVENT_NAME: 'issue_comment',
      //   GITHUB_EVENT_PATH: path.join(
      //     __dirname,
      //     '../__mocks__/@actions/github.ts'
      //   ),
      //   GITHUB_REF: 'main',
      //   GITHUB_REPOSITORY: 'TAKANOME-DEV/testing',
      //   GITHUB_SHA: '123abc',
      //   GITHUB_TOKEN: '_',
      //   GITHUB_WORKFLOW: 'my-workflow',
      //   GITHUB_WORKSPACE: path.join(
      //     __dirname,
      //     '../__mocks__/@actions/github.ts'
      //   ),
      //   HOME: '?',
      // },
      helpers.getDefaultValues()
    );

    // GitHub workspace
    // process.env['GITHUB_WORKSPACE'] = path.join(
    //   __dirname,
    //   '../__mocks__/@actions/github.ts'
    // );
  });

  afterEach(() => {
    delete process.env.INPUT_REQUIRED_LABEL;
  });

  afterAll(() => {
    // Restore GitHub workspace
    // delete process.env['GITHUB_WORKSPACE'];
    // if (originalGitHubWorkspace) {
    //   process.env['GITHUB_WORKSPACE'] = originalGitHubWorkspace;
    // }

    // // Restore @actions/github context
    // github.context.ref = originalContext.ref;
    // github.context.sha = originalContext.sha;

    // Restore
    jest.restoreAllMocks();
  });

  it('should assigns the user to the issue', async () => {
    await commentHandler(core, github);
    const client = github.getOctokit('_');

    expect(client.rest.issues.addAssignees).toHaveBeenCalledTimes(1);
    expect(client.rest.issues.addAssignees).toHaveBeenCalledWith({
      owner: 'TAKANOME-DEV',
      repo: 'testing',
      issue_number: 1,
      assignees: ['John'],
    });
    expect(client.rest.issues.addLabels).toHaveBeenCalledTimes(1);
    expect(client.rest.issues.addLabels).toHaveBeenCalledWith({
      owner: 'TAKANOME-DEV',
      repo: 'testing',
      issue_number: 1,
      labels: ['Is-Assigned'],
    });
    expect(client.rest.issues.createComment).toHaveBeenCalledTimes(1);
    expect(github.context.payload.comment).toMatchSnapshot();
  });

  it('exits early if the issue is already assigned', async () => {
    // jest.fn(core)
    github.context.payload.issue!.assignee = 'Saladin';
    await commentHandler(core, github);
    expect(core.setFailed).toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenCalledWith(
      'Issue #1 is already assigned to @Saladin'
    );
    delete github.context.payload.issue?.assignee;
  });
});
