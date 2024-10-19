export const context = {
  payload: {
    comment: {
      user: {
        login: 'john-doe',
      },
      body: "Hey, I'm interested in this issue. Can you /assign-me please?",
      html_url: 'https://github.com/takanome-dev/test-action',
    },
    issue: {
      labels: [],
      assignee: {
        login: 'takanome-dev',
      },
      number: 1,
      created_at: '2022-12-09T00:00:00Z',
    },
  },
  repo: {
    owner: 'TAKANOME-DEV',
    repo: 'test-action',
  },
  action: 'created',
};

const mockApi = {
  rest: {
    issues: {
      addAssignees: jest.fn().mockImplementation(() => ({
        data: {
          assignees: [
            {
              login: 'John',
            },
          ],
        },
      })),
      addLabels: jest.fn(),
      createComment: jest.fn(),
      removeLabel: jest.fn(),
      removeAssignees: jest.fn(),
      listComments: jest.fn().mockImplementation(() => ({
        data: [
          {
            user: {
              login: 'takanome-dev',
            },
            created_at: '2022-12-09T00:00:00Z',
          },
          {
            user: {
              login: 'john-doe',
            },
          },
          {
            user: {
              login: 'copilot',
            },
          },
        ],
      })),
    },
    search: {
      issuesAndPullRequests: jest.fn().mockImplementation(() => ({
        data: {
          items: [
            {
              number: 1,
              labels: ['📍 Assigned'],
              assignee: {
                login: 'John',
              },
              updated_at: '2022-12-09T00:00:00Z',
            },
            {
              number: 2,
              labels: ['📍 Assigned'],
              assignee: {
                login: 'Brian',
              },
              updated_at: '2022-12-05T00:00:00Z',
            },
            // {
            //   number: 3,
            //   labels: [],
            //   assignee: {
            //     login: 'Jim',
            //   },
            //   updated_at: '2022-12-06T00:00:00Z',
            // },
            // {
            //   number: 4,
            //   labels: ['📍 Assigned', '📌 Pinned'],
            //   assignee: {
            //     login: 'Steve',
            //   },
            //   updated_at: '2022-12-07T00:00:00Z',
            // },
          ],
        },
      })),
    },
  },
};

export const getOctokit = jest.fn().mockImplementation(() => mockApi);
