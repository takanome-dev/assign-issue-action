<h2 align="center">💬 Assign To Me Action ✋</h2>

<p align="center"><a href="https://github.com/TAKANOME-DEV/assign-to-me-action"><img alt="GitHub Actions status" src="https://github.com/TAKANOME-DEV/assign-to-me-action/actions/workflows/ci.yml/badge.svg"></a> <a href="https://github.com/TAKANOME-DEV/assign-to-me-action"><img alt="GitHub Actions status" src="https://github.com/TAKANOME-DEV/assign-to-me-action/actions/workflows/codeql-analysis.yml/badge.svg"></a> <a href="https://codecov.io/gh/TAKANOME-DEV/assign-to-me-action"><img src="https://codecov.io/gh/TAKANOME-DEV/assign-to-me-action/branch/master/graph/badge.svg?token=MX3SB0GFB3" /></a></p>

---

A GitHub Action that listens for a `/assign-to-me` "command" (an issue comment that starts with `/assign-to-me`) and assigns the commenter to the issue. It can also unassign issues that have been assigned for a configured amount of time.

This Action is heavily inspired by [JasonEtco/slash-assign-action](https://github.com/JasonEtco/slash-assign-action)

## Usage

Create a workflow (eg: `.github/workflows/assign-to-me.yml` learn more about [Creating a Workflow file](https://docs.github.com/en/actions/using-workflows#creating-a-workflow-file)) to utilize the `assign-to-me` action with content:

```yaml
name: Assign To Me Action

on:
  schedule:
    - cron: 0 0 * * *
  issue_comment:
    types: [created]

jobs:
  assign:
    # If the acton was triggered by a new comment that starts with `/assign-to-me`
    # or a on a schedule
    if: >
      (github.event_name == 'issue_comment' && startsWith(github.event.comment.body, '/assign-to-me')) ||
      github.event_name == 'schedule'
    runs-on: ubuntu-latest
    steps:
      - name: Assign the user or unassign stale assignments
        uses: takanome-dev/assign-to-me-action@v1.0.1
        with:
          github_token: '${{ secrets.GITHUB_TOKEN }}'
          required_label: good-first-issue # you can change this label if you wish
          assigned_label: Is-Assigned # you can change this label if you wish
```

## Inputs

Various inputs are defined in action.yml to let you configure the action:

| Name                  | Description                                                                                                                                                                                                                                                                                                                                                                 | Default                                                                                                                                                                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `github_token`        | PAT for GitHub API authentication                                                                                                                                                                                                                                                                                                                                           | `${{ github.token }}`                                                                                                                                                                                                                                               |
| `assigned_label`      | A label that is added to issues when they're assigned, to track which issues were assigned by this action.                                                                                                                                                                                                                                                                  | `Is-Assigned`                                                                                                                                                                                                                                                       |
| `required_label`      | If set, the issue must have this label to be assigned.                                                                                                                                                                                                                                                                                                                      | N/A                                                                                                                                                                                                                                                                 |
| `days_until_unassign` | The span of time between a user assigning themselves to the issue being unassigned automatically by the action.                                                                                                                                                                                                                                                             | `7`                                                                                                                                                                                                                                                                 |
| `pin_label`           | A label that prevents the user from being unassigned, typically for issues that are expected to take a long time.                                                                                                                                                                                                                                                           | `Pinned`                                                                                                                                                                                                                                                            |
| `assigned_comment`    | The comment posted after a user has assigned themselves to an issue. This is a Mustache template that supports the following variables: - `inputs` (the inputs given to the action) - `comment` (an object of the comment that was created) - `totalDays` (`days_until_warning` + `days_until_unassign`) - `env` (`process.env`, anything you pass to the action via `env`) | `This issue [has been assigned]({{ comment.html_url }}) to {{ comment.user.login }}! It will become unassigned if it isn't closed within {{ totalDays }} days. A maintainer can also add the **{{ inputs.pin_label }}** label to prevent it from being unassigned.` |

## `workflow_dispatch` trigger

You can also manually trigger this action via the `workflow_dispatch` event. You'll need to modify the `if` property:

```yaml
if: >
  (github.event_name == 'issue_comment' && startsWith(github.event.comment.body, '/assign')) ||
  github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
```

## Contributing

We would love you to contribute to `takanome-dev/assign-to-me`, pull requests are welcome!
Please see the [CONTRIBUTING.md](CONTRIBUTING.md) for more information.

## ⚖️ Licence

The scripts and documentation in this project are released under the [MIT License](LICENSE)
