/* eslint-disable no-undef */

import mustache from 'mustache';
import { Core, Github } from '..';
import helpers from './helpers';

export default async function commentHandler(core: Core, github: Github) {
  const issue = github.context.payload.issue;
  const comment = github.context.payload.comment;
  const token = core.getInput('github_token');

  // Check if github_token input is provided
  if (!token) return core.setFailed(`Missing required input: token = ${token}`);

  const client = github.getOctokit(token);
  const requiredLabel = core.getInput('required_label');

  // Check if required_label input is provided
  if (!requiredLabel)
    return core.setFailed(
      `Missing required input: required_label = ${core.getInput(
        'required_label'
      )}`
    );

  // Check if the issue has the required label
  const hasLabel = issue?.labels?.find(
    (label: { name: string }) => label.name === requiredLabel
  );

  if (!hasLabel)
    return core.setFailed(
      `Required label: [${core.getInput(
        'required_label'
      )}] label not found in issue #${issue?.number}.`
    );

  // Check if it has no assignees
  if (issue?.assignee) {
    return core.setFailed(
      `Issue #${issue?.number} is already assigned to @${issue?.assignee}`
    );
  }

  core.info(`Assigning @${comment?.user?.login} to #${issue?.number}`);

  // Assign the issue to the user and add label assigned_label
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

  const body = mustache.render(core.getInput('assigned_comment'), {
    totalDays,
    comment,
    env: process.env,
    inputs: helpers.getInputs(),
  });

  // Comment
  await client.rest.issues.createComment({
    ...github.context.repo,
    issue_number: issue?.number as number,
    body,
  });
}
