/* eslint-disable filenames/match-regex */
import * as core from '@actions/core';
import * as github from '@actions/github';
import nock from 'nock';
import commandHandler from '../../src/lib/command-handler';
import helpers from '../helpers';

jest.mock('@actions/core');
jest.mock('@actions/github');

// const gh = github.getOctokit('_');
// const addAssigneesMock = jest.spyOn(gh.rest.issues, 'addAssignees');
// const addLabelsMock = jest.spyOn(gh.rest.issues, 'addLabels');

// afterAll(() => jest.restoreAllMocks());

describe('command-handler', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  it('should assigns the user to the issue', async () => {
    const { scope, requests } = helpers.nockRequests([
      {
        uri: '/repos/JasonEtco/testing/issues/1/assignees',
        method: 'post',
        response: { status: 200 },
      },
      {
        uri: '/repos/JasonEtco/testing/issues/1/labels',
        method: 'post',
        response: { status: 200 },
      },
      {
        uri: '/repos/JasonEtco/testing/issues/1/comments',
        method: 'post',
        response: { status: 200 },
      },
    ]);

    await commandHandler(core, github);
    expect(scope.isDone()).toBe(true);
    expect(core.ExitCode.Failure).not.toHaveBeenCalled();

    const [assignReq, labelReq, commentReq] = requests;
    console.log({ assignReq, labelReq, commentReq });

    expect(assignReq.reqBody.assignees).toEqual([
      github.context.payload.comment?.user.login,
    ]);
    expect(labelReq.reqBody.labels).toEqual(['Is-Assigned']);
    expect(commentReq.reqBody.body).toMatchSnapshot();
  });
});
