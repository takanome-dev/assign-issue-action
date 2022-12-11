import * as core from '@actions/core';
import * as github from '@actions/github';
import scheduleHandler from '../src/lib/schedule';

const client = github.getOctokit('token');

describe('Schedule Handler', () => {
  beforeAll(() => {
    jest.spyOn(core, 'getInput');
    process.env.INPUT_GITHUB_TOKEN = 'token';
    process.env.INPUT_DAYS_UNTIL_UNASSIGN = '7';
    process.env.INPUT_ASSIGNED_LABEL = 'Is-Assigned';
    process.env.INPUT_PIN_LABEL = 'Pinned';
  });

  it('should search issues with assigned_label and unassign the user', async () => {
    await scheduleHandler(core);
    expect(core.getInput).toHaveBeenCalled();
    expect(client.rest.search.issuesAndPullRequests).toHaveBeenCalled();
    expect(client.rest.issues.removeAssignees).toHaveBeenCalled();
    expect(client.rest.issues.removeLabel).toHaveBeenCalled();
  });
});
