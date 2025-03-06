<h2 align="center">💬 Assign Issue Action ✋</h2>

<p align="center"><a href="https://github.com/TAKANOME-DEV/assign-to-me-action"><img alt="Licence Badge" src="https://img.shields.io/github/license/TAKANOME-DEV/assign-to-me-action?color=%2330C151"></a> <a href="https://github.com/TAKANOME-DEV/assign-to-me-action"><img alt="Release Badge" src="https://img.shields.io/github/release/TAKANOME-DEV/assign-to-me-action?color=%2330C151"></a> <a href="https://github.com/TAKANOME-DEV/assign-to-me-action"><img alt="GitHub Actions status" src="https://github.com/TAKANOME-DEV/assign-to-me-action/actions/workflows/development.yml/badge.svg"></a> <a href="https://github.com/TAKANOME-DEV/assign-to-me-action"><img alt="GitHub Actions status" src="https://github.com/TAKANOME-DEV/assign-to-me-action/actions/workflows/codeql-analysis.yml/badge.svg"></a> <a href="https://codecov.io/gh/TAKANOME-DEV/assign-to-me-action"><img src="https://codecov.io/gh/TAKANOME-DEV/assign-to-me-action/branch/master/graph/badge.svg?token=MX3SB0GFB3" /></a></p>

---

This action simplifies issue management for maintainers and contributors, making collaboration more efficient.
Enable commands that streamline issue assignments:

- `/assign-me` for contributors to self-assign.
- `/unassign-me` for self-unassignment.
- `/assign @<user>` for maintainers to assign specific users.
- `/unassign @<user>` for maintainers to unassign others easily.

It can also unassign issues that have been assigned for a configured amount of time.

## 💻 Usage

Create a workflow (eg: `.github/workflows/assign.yml` learn more about [Creating a Workflow file](https://docs.github.com/en/actions/using-workflows#creating-a-workflow-file)):

```yaml
name: Assign Issue

on:
  schedule:
    - cron: 0 0 * * *
  issue_comment:
    types: [created]
  workflow_dispatch:

jobs:
  assign:
    permissions:
      issues: write
    runs-on: ubuntu-latest
    steps:
      - name: Assign the user or unassign stale assignments
        uses: takanome-dev/assign-issue-action@beta
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          maintainers: '' # list of maintainers with comma separated like 'takanome-dev,octocat'
          # learn more about the inputs below ⬇
```

## Inputs

Various inputs are defined in action.yml to let you configure the action:

| Name                            | Description                                                                                                                                                                                                 | Default                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `github_token`                  | PAT for GitHub API authentication. It's automatically generated when the action is running, so no need to add it into your secrets.                                                                         | `${{ github.token }}`                                                                                                                                                                                                                                                                                                                      |
| `self_assign_cmd`               | The command that assigns the issue to the one who triggered it                                                                                                                                              | `/assign-me`                                                                                                                                                                                                                                                                                                                               |
| `self_unassign_cmd`             | The command that unassigns the issue from the user who triggered it, if they are already assigned.                                                                                                          | `/unassign-me`                                                                                                                                                                                                                                                                                                                             |
| `assign_user_cmd`               | The command that assigns the user to the issue                                                                                                                                                              | `/assign @<user>`                                                                                                                                                                                                                                                                                                                          |
| `unassign_user_cmd`             | The command that unassigns the user from the issue, if they are assigned.                                                                                                                                   | `/unassign @<user>`                                                                                                                                                                                                                                                                                                                        |
| `maintainers`                   | A list of maintainers authorized to use `/assign` and `/unassign` commands. List the usernames with comma separated (i.e: 'takanome-dev,octokit'). If not set, the usage of those commands will be ignored. | `''`                                                                                                                                                                                                                                                                                                                                       |
| `enable_auto_suggestion`        | A boolean input that controls whether the action should automatically check user comments for phrases signaling interest in issue assignment. Set to true by default.                                       | **`true`**                                                                                                                                                                                                                                                                                                                                 |
| `assigned_label`                | A label that is added to issues when they're assigned, to track which issues were assigned by this action.                                                                                                  | `📍 Assigned`                                                                                                                                                                                                                                                                                                                              |
| `required_label`                | If set, the issue must have this label to be assigned.                                                                                                                                                      | `''`                                                                                                                                                                                                                                                                                                                                       |
| `days_until_unassign`           | The span of time between a user assigning themselves to the issue being unassigned automatically by the action.                                                                                             | `7`                                                                                                                                                                                                                                                                                                                                        |
| `pin_label`                     | A label that prevents the user from being unassigned, typically for issues that are expected to take a long time.                                                                                           | `📌 Pinned`                                                                                                                                                                                                                                                                                                                                |
| `assigned_comment`              | The comment posted after a user has assigned themselves to an issue.                                                                                                                                        | `👋 Hey @{{ handle }}, thanks for your interest in this issue! 🎉 ⏳ Please note, you will be automatically unassigned if the issue isn't closed within **{{ total_days }} days** (by **{{ unassigned_date }}**). A maintainer can also add the "**{{ pin_label }}**"" label to prevent automatic unassignment.`                           |
| `already_assigned_comment`      | The comment posted when a user tries to assign themselves to an issue that is already assigned                                                                                                              | `👋 Hey @{{ handle }}, this issue is already assigned to @{{ assignee }}. [!NOTE] ⏳ If the issue isn't closed within **{{ total_days }} days**, it will be automatically unassigned. A maintainer can also add you to the list of assignees or swap you with the current assignee.`                                                       |
| `unassigned_comment`            | The comment posted after a user is unassigned from an issue.                                                                                                                                                | `👋 Hey @{{ handle }}, you've been automatically unassigned from this issue due to inactivity.[!NOTE] If you'd like to be re-assigned, just leave another comment or ask a maintainer to assign you again. If you're still actively working on the issue, let us know by commenting, and we can pin it to prevent automatic unassignment.` |
| `assignment_suggestion_comment` | The comment posted when someone shows interest in being assigned to an issue without using the assignment commands.                                                                                         | `👋 Hey @{{ handle }}, it looks like you're interested in working on this issue! 🎉 If you'd like to take on this issue, please use the command /assign-me to assign yourself.`                                                                                                                                                            |

## Outputs

The action provides the following outputs that can be used in subsequent workflow steps:

| Name                | Description                                                                      |
| ------------------- | -------------------------------------------------------------------------------- |
| `assigned`          | Returns 'yes' if an issue was successfully assigned, 'no' otherwise              |
| `unassigned`        | Returns 'yes' if an issue was successfully unassigned, 'no' otherwise            |
| `unassigned_issues` | An array containing the issue numbers that were unassigned during the action run |

## ✏️ Contributing

We would love you to contribute to this project, pull requests are welcome!
Please see the [CONTRIBUTING.md](CONTRIBUTING.md) for more information.

## ⚖️ LICENSE

The scripts and documentation in this project are released under the [MIT License](LICENSE)
