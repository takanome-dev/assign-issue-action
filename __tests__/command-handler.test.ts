/* eslint-disable filenames/match-regex */

import * as core from '@actions/core';
import * as github from '@actions/github';
import fs from 'fs';
import jsYaml from 'js-yaml';
import path from 'path';
import commandHandler from '../src/lib/command-handler';

/**
 * Helper that reads the `action.yml` and includes the default values
 * for each input as an environment variable, like the Actions runtime does.
 */
function getDefaultValues() {
  // eslint-disable-next-line no-undef
  const yaml = fs.readFileSync(path.join(__dirname, '../action.yml'), 'utf8');
  const { inputs } = jsYaml.load(yaml) as any;

  return Object.keys(inputs).reduce((acc, key) => {
    if ('default' in inputs[key]) {
      return {
        ...acc,
        [`INPUT_${key.toUpperCase()}`]: inputs[key].default,
      };
    } else {
      return acc;
    }
  }, {});
}

console.log('default Values', getDefaultValues());

Object.assign(
  process.env,
  {
    GITHUB_ACTION: 'my-action',
    GITHUB_ACTOR: 'TAKANOME-DEV',
    GITHUB_EVENT_NAME: 'issue_comment',
    GITHUB_EVENT_PATH: path.join(__dirname, '../__mocks__/@actions/github.ts'),
    GITHUB_REF: 'main',
    GITHUB_REPOSITORY: 'TAKANOME-DEV/testing',
    GITHUB_SHA: '123abc',
    GITHUB_TOKEN: '_',
    GITHUB_WORKFLOW: 'my-workflow',
    GITHUB_WORKSPACE: path.join(__dirname, '../__mocks__/@actions/github.ts'),
    HOME: '?',
  },
  getDefaultValues()
);

jest.mock('@actions/core');
jest.mock('@actions/github');

const gh = github.getOctokit('_');
const addAssigneesMock = jest.spyOn(gh.rest.issues, 'addAssignees');
const addLabelsMock = jest.spyOn(gh.rest.issues, 'addLabels');
// const createCommentMock = jest.spyOn(gh.rest.issues, 'createComment');

afterAll(() => jest.restoreAllMocks());

describe('command-handler', () => {
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
