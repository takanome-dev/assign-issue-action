/* eslint-disable no-undef */
import path from 'path';
import helpers from './helpers';

Object.assign(
  process.env,
  {
    GITHUB_ACTION: 'my-action',
    GITHUB_ACTOR: 'JasonEtco',
    GITHUB_EVENT_NAME: 'issue_comment',
    GITHUB_EVENT_PATH: path.join(
      __dirname,
      'fixtures',
      'issue_comment.created.json'
    ),
    GITHUB_REF: 'main',
    GITHUB_REPOSITORY: 'JasonEtco/testing',
    GITHUB_SHA: '123abc',
    GITHUB_TOKEN: '456def',
    GITHUB_WORKFLOW: 'my-workflow',
    GITHUB_WORKSPACE: path.join(__dirname, 'fixtures', 'workspace'),
    HOME: '?',
  },
  helpers.getDefaultValues()
);
