<h2 align="center">💬 Assign Issue Action ✋</h2>

<p align="center"><a href="https://github.com/TAKANOME-DEV/assign-to-me-action"><img alt="Licence Badge" src="https://img.shields.io/github/license/TAKANOME-DEV/assign-to-me-action?color=%2330C151"></a> <a href="https://github.com/TAKANOME-DEV/assign-to-me-action"><img alt="Licence Badge" src="https://img.shields.io/github/release/TAKANOME-DEV/assign-to-me-action?color=%2330C151"></a> <a href="https://github.com/TAKANOME-DEV/assign-to-me-action"><img alt="GitHub Actions status" src="https://github.com/TAKANOME-DEV/assign-to-me-action/actions/workflows/ci.yml/badge.svg"></a> <a href="https://github.com/TAKANOME-DEV/assign-to-me-action"><img alt="GitHub Actions status" src="https://github.com/TAKANOME-DEV/assign-to-me-action/actions/workflows/codeql-analysis.yml/badge.svg"></a> <a href="https://codecov.io/gh/TAKANOME-DEV/assign-to-me-action"><img src="https://codecov.io/gh/TAKANOME-DEV/assign-to-me-action/branch/master/graph/badge.svg?token=MX3SB0GFB3" /></a></p>

---

A GitHub Action that listens for a `/assign-me` "command" (an issue comment that starts with `/assign-me` or a specific trigger) and assigns the issue to the user who commented (or the user who triggered the action
It can also unassign issues that have been assigned for a configured amount of time.

This Action is heavily inspired by [JasonEtco/slash-assign-action](https://github.com/JasonEtco/slash-assign-action)

## 🚀 Usage

Create a workflow (eg: `.github/workflows/assign.yml` learn more about [Creating a Workflow file](https://docs.github.com/en/actions/using-workflows#creating-a-workflow-file)) to utilize the `trigger` action with content:

```yaml
name: Assign Issue Action

on:
  schedule:
    - cron: 0 0 * * *
  issue_comment:
    types: [created]
  workflow_dispatch:

jobs:
  assign:
    runs-on: ubuntu-latest
    steps:
      - name: Assign the user or unassign stale assignments
        uses: takanome-dev/assign-issue-action@v2.0.0
        with:
          github_token: '${{ secrets.GITHUB_TOKEN }}'
          # trigger: '/assign-me' # you can change the default trigger to something else
          # required_label: help wanted # if present, the issue must have this label to be assigned
          # assigned_label: Assigned
          # days_until_unassign: 7
          # learn more about the inputs below ⬇
```

## Inputs

Various inputs are defined in action.yml to let you configure the action:

| Name                       | Description                                                                                                                                                                                                                                                                              | Default                                                                                                                                                                                                                                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `github_token`             | PAT for GitHub API authentication                                                                                                                                                                                                                                                        | `${{ github.token }}`                                                                                                                                                                                                                                                                                               |
| `trigger`                  | The comment that triggers the action                                                                                                                                                                                                                                                     | `/assign-me`                                                                                                                                                                                                                                                                                                        |
| `assigned_label`           | A label that is added to issues when they're assigned, to track which issues were assigned by this action.                                                                                                                                                                               | `Assigned`                                                                                                                                                                                                                                                                                                          |
| `required_label`           | If set, the issue must have this label to be assigned.                                                                                                                                                                                                                                   | N/A                                                                                                                                                                                                                                                                                                                 |
| `days_until_unassign`      | The span of time between a user assigning themselves to the issue being unassigned automatically by the action.                                                                                                                                                                          | `7`                                                                                                                                                                                                                                                                                                                 |
| `pin_label`                | A label that prevents the user from being unassigned, typically for issues that are expected to take a long time.                                                                                                                                                                        | `Pinned`                                                                                                                                                                                                                                                                                                            |
| `assigned_comment`         | The comment posted after a user has assigned themselves to an issue. <br>This is a Mustache template that supports the following variables: <br>- `inputs`: the inputs given to the action<br>- `comment`: an object holding the commenter infos<br>- `totalDays`: `days_until_unassign` | `👋 Hey @{{ comment.user.login }}, thanks for your interest in this issue! 🎉<br>⚠ Note that this issue will become unassigned if it isn't closed within **{{ totalDays }} days**.<br><br>🔧 A maintainer can also add the **{{ inputs.pin_label }}** label to prevent it from being unassigned automatically.<br>` |
| `already_assigned_comment` | The comment posted when a user tries to assign themselves to an issue that is already assigned.                                                                                                                                                                                          | `👋 Hey @{{ comment.user.login }}, this issue is already assigned to @{{ assignee.login }}.<br>⚠️ It will become unassigned if it isn't closed within **{{ daysUntilUnassign }} days**. <br><br>🔧 A maintainer can also add you to the list of assignees or swap you with the current assignee.<br>`               |

## ✏️ Contributing

We would love you to contribute to `takanome-dev/assign-issue-action`, pull requests are welcome!
Please see the [CONTRIBUTING.md](CONTRIBUTING.md) for more information.

## ⚖️ Licence

The scripts and documentation in this project are released under the [MIT License](LICENSE)
