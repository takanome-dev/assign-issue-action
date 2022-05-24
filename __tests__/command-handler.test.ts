/* eslint-disable filenames/match-regex */

import * as core from '@actions/core';
import * as github from '@actions/github';
import path from 'path';
import commandHandler from '../src/lib/command-handler';
import helpers from '../src/lib/helpers';

jest.mock('@actions/core');
jest.mock('@actions/github');

const gh = github.getOctokit('_');
const addAssigneesMock = jest.spyOn(gh.rest.issues, 'addAssignees');
const addLabelsMock = jest.spyOn(gh.rest.issues, 'addLabels');
// const createCommentMock = jest.spyOn(gh.rest.issues, 'createComment');

const originalGitHubWorkspace = process.env['GITHUB_WORKSPACE'];

// Inputs for mock @actions/core
// let inputs = {} as any;

// Shallow clone original @actions/github context
let originalContext = { ...github.context };

describe('command-handler', () => {
  beforeAll(() => {
    // Mock getInput
    // jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
    //   return inputs[name];
    // });

    // Mock github context
    // jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
    //   return {
    //     owner: 'some-owner',
    //     repo: 'some-repo'
    //   }
    // })
    Object.assign(
      process.env,
      {
        GITHUB_ACTION: 'my-action',
        GITHUB_ACTOR: 'TAKANOME-DEV',
        GITHUB_EVENT_NAME: 'issue_comment',
        GITHUB_EVENT_PATH: path.join(
          __dirname,
          '../__mocks__/@actions/github.ts'
        ),
        GITHUB_REF: 'main',
        GITHUB_REPOSITORY: 'TAKANOME-DEV/testing',
        GITHUB_SHA: '123abc',
        GITHUB_TOKEN: '_',
        GITHUB_WORKFLOW: 'my-workflow',
        GITHUB_WORKSPACE: path.join(
          __dirname,
          '../__mocks__/@actions/github.ts'
        ),
        HOME: '?',
      },
      helpers.getDefaultValues()
    );

    // GitHub workspace
    process.env['GITHUB_WORKSPACE'] = path.join(
      __dirname,
      '../__mocks__/@actions/github.ts'
    );
  });

  // beforeEach(() => {
  //   // Reset inputs
  //   inputs = {};
  // });

  afterEach(() => {
    delete process.env.INPUT_REQUIRED_LABEL;
  });

  afterAll(() => {
    // Restore GitHub workspace
    delete process.env['GITHUB_WORKSPACE'];
    if (originalGitHubWorkspace) {
      process.env['GITHUB_WORKSPACE'] = originalGitHubWorkspace;
    }

    // Restore @actions/github context
    github.context.ref = originalContext.ref;
    github.context.sha = originalContext.sha;

    // Restore
    jest.restoreAllMocks();
  });

  it('should assigns the user to the issue', async () => {
    await commandHandler(core, github);

    expect(addAssigneesMock).toHaveBeenCalledTimes(1);
    // expect(addAssigneesMock).toHaveBeenCalledWith({
    //   owner: 'takanome_dev',
    //   repo: 'testing',
    //   issue_number: 1,
    //   assignees: ['John'],
    // });
    expect(addLabelsMock).toHaveBeenCalledTimes(1);
    // expect(addLabelsMock).toHaveBeenCalledWith({
    //   owner: 'takanome_dev',
    //   repo: 'testing',
    //   issue_number: 1,
    //   labels: ['Is-Assigned'],
    // });
    // expect(createCommentMock).toHaveBeenCalledTimes(1);
    // expect(createCommentMock).toHaveBeenCalledWith({
    //   totalDays: 7,
    //   body: `This issue [has been assigned](https://github.com/testing) to @John!
    //   It will become unassigned if it isn't closed within 7 days.
    //   A maintainer can also add the **pinned** label to prevent it from being unassigned.`,
    // });

    // const [assignReq, labelReq, commentReq] = requests;
    // console.log({ assignReq, labelReq, commentReq });

    // expect(assignReq.reqBody.assignees).toEqual([
    //   github.context.payload.comment?.user.login,
    // ]);
    // expect(labelReq.reqBody.labels).toEqual(['Is-Assigned']);
    // expect(commentReq.reqBody.body).toMatchSnapshot();
  });
});
