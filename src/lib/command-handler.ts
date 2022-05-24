/* eslint-disable no-undef */
/* eslint-disable no-console */

import mustache from 'mustache';
import { Core, Github } from '..';
import helpers from './helpers';

export default async function commentHandler(core: Core, github: Github) {
  const issue = github.context.payload.issue;
  const comment = github.context.payload.comment;
  console.log({ issue, comment });

  // Check required context properties exist
  if (!issue || !comment) {
    throw new Error(
      `Required context properties are missing: issue: ${issue} - comment: ${comment}`
    );
  }

  const token = core.getInput('github_token', { required: true });
  console.log({ token });

  // Check required inputs
  // if (!token) {
  //   throw new Error(`Missing required input 'token': ${token}`);
  // }

  const client = github.getOctokit(token);

  // Check if the issue has the configured label
  if (core.getInput('required_label')) {
    const hasLabel = issue?.labels?.some(
      (label: { name: string }) =>
        label.name === core.getInput('required_label')
    );

    if (!hasLabel)
      return core.setFailed(
        `Required label [${core.getInput(
          'required_label'
        )}] label not found in issue #${issue?.number}.`
      );
  }

  // Check if it has no assignees
  if (issue?.assignee) {
    return core.setFailed(
      `Issue #${issue?.number} is already assigned to @${issue?.assignee}`
    );
  }

  core.info(`Assigning @${comment?.user?.login} to #${issue?.number}`);

  await Promise.all([
    await client.rest.issues.addAssignees({
      ...github.context.repo,
      issue_number: issue?.number as number,
      assignees: [comment?.user.login],
    }),
    await client.rest.issues.addLabels({
      ...github.context.repo,
      issue_number: issue?.number as number,
      labels: [core.getInput('assigned_label')],
    }),
  ]);

  const totalDays = parseInt(core.getInput('days_until_unassign'), 10);
  console.log({ totalDays });

  const body = mustache.render(core.getInput('assigned_comment'), {
    totalDays,
    comment,
    env: process.env,
    inputs: helpers.getInputs(),
  });
  console.log({ body });

  // Comment saying passus
  await client.rest.issues.createComment({
    ...github.context.repo,
    issue_number: issue?.number as number,
    body,
  });
}
