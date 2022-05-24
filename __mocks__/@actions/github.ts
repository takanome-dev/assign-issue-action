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
      removeLabel: jest.fn(),
      removeAssignee: jest.fn(),
    },
  },
};

export const getOctokit = jest.fn().mockImplementation(() => mockApi);
