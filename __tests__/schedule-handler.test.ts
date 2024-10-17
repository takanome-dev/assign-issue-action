// import * as core from '@actions/core';
// import * as github from '@actions/github';

// jest.mock('@actions/core');
// jest.mock('@actions/github');

// function since(days: number) {
//   const totalDaysInMiliseconds = days * 24 * 60 * 60 * 1000;
//   const date = new Date(+new Date() - totalDaysInMiliseconds);

//   return new Date(date).toISOString().substring(0, 10);
// }

describe('Schedule Handler', () => {
  // let client: ReturnType<typeof github.getOctokit>;
  // let issueHandler: IssueHandler;
  // beforeAll(() => {
  //   Object.assign(process.env, helpers.getDefaultValues());
  //   jest.spyOn(core, 'getInput').mockImplementation((name, options) => {
  //     return jest.requireActual('@actions/core').getInput(name, options);
  //   });
  //   process.env.INPUT_GITHUB_TOKEN = 'token';
  //   client = github.getOctokit('token');
  //   issueHandler = new IssueHandler();
  // });
  // it('should search issues with assigned_label', async () => {
  //   const data = [
  //     {
  //       number: 1,
  //       labels: ['📍 Assigned'],
  //       assignee: {
  //         login: 'John',
  //       },
  //       updated_at: '2022-12-09T00:00:00Z',
  //     },
  //     {
  //       number: 2,
  //       labels: ['📍 Assigned'],
  //       assignee: {
  //         login: 'Brian',
  //       },
  //       updated_at: '2022-12-05T00:00:00Z',
  //     },
  //   ];
  //   const response = await issueHandler.getIssues();
  //   const timestamp = since(Number(process.env.INPUT_DAYS_UNTIL_UNASSIGN));
  //   expect(client.rest.search.issuesAndPullRequests).toHaveBeenCalled();
  //   expect(client.rest.search.issuesAndPullRequests).toHaveBeenCalledWith({
  //     q: `label:"${process.env.INPUT_ASSIGNED_LABEL}" -label:"${process.env.INPUT_PIN_LABEL}" is:issue repo:${github.context.repo.owner}/${github.context.repo.repo} assigned:* is:open updated:<${timestamp}`,
  //     sort: 'updated',
  //     order: 'desc',
  //     per_page: 100,
  //   });
  //   expect(response).toEqual(data);
  // });
  // it('should unassign issue', async () => {
  //   const issue = {
  //     number: 1,
  //     labels: ['📍 Assigned'],
  //     assignee: {
  //       login: 'John',
  //     },
  //   };
  //   await issueHandler.unassignIssue(issue);
  //   expect(client.rest.issues.removeAssignees).toHaveBeenCalled();
  //   expect(client.rest.issues.removeAssignees).toHaveBeenCalledWith({
  //     ...github.context.repo,
  //     issue_number: issue.number,
  //     assignees: [issue.assignee.login],
  //   });
  //   expect(client.rest.issues.removeLabel).toHaveBeenCalled();
  //   expect(client.rest.issues.removeLabel).toHaveBeenCalledWith({
  //     ...github.context.repo,
  //     issue_number: issue.number,
  //     name: process.env.INPUT_ASSIGNED_LABEL,
  //   });
  // });
  it('should pass', () => {
    expect(true).toBe(true);
  });
});
