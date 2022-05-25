export const context = {
  payload: {
    comment: {
      user: {
        login: 'John',
      },
      body: '/assign-to-me',
      html_url: 'https://github.com/TAKANOME-DEV/testing',
    },
    issue: {
      labels: [],
      assignee: null,
      number: 1,
    },
  },
  repo: {
    owner: 'TAKANOME-DEV',
    repo: 'testing',
  },
  action: 'created',
};

const mockApi = {
  rest: {
    issues: {
      addAssignees: jest.fn(),
      addLabels: jest.fn(),
      createComment: jest.fn(),
      removeLabel: jest.fn(),
      removeAssignee: jest.fn(),
    },
    search: {
      issuesAndPullRequests: jest.fn().mockImplementation(() => ({
        status: 200,
        body: {
          items: [
            {
              number: 1,
              labels: [],
              assignee: {
                login: 'John',
              },
            },
          ],
        },
      })),
    },
  },
};

export const getOctokit = jest.fn().mockImplementation(() => mockApi);
