<h2 align="center">💬 Assign Issue Action ✋</h2>

<p align="center"><a href="https://github.com/TAKANOME-DEV/assign-to-me-action"><img alt="Licence Badge" src="https://img.shields.io/github/license/TAKANOME-DEV/assign-to-me-action?color=%2330C151"></a> <a href="https://github.com/TAKANOME-DEV/assign-to-me-action"><img alt="Release Badge" src="https://img.shields.io/github/release/TAKANOME-DEV/assign-to-me-action?color=%2330C151"></a> <a href="https://github.com/TAKANOME-DEV/assign-to-me-action"><img alt="GitHub Actions status" src="https://github.com/TAKANOME-DEV/assign-to-me-action/actions/workflows/development.yml/badge.svg"></a> <a href="https://github.com/TAKANOME-DEV/assign-to-me-action"><img alt="GitHub Actions status" src="https://github.com/TAKANOME-DEV/assign-to-me-action/actions/workflows/codeql-analysis.yml/badge.svg"></a> <a href="https://codecov.io/gh/TAKANOME-DEV/assign-to-me-action"><img src="https://codecov.io/gh/TAKANOME-DEV/assign-to-me-action/branch/master/graph/badge.svg?token=MX3SB0GFB3" /></a></p>

---

This action simplifies issue management for maintainers and contributors, making collaboration more efficient.
See the list of [features](#features) below for more details.

## Features

- 📝 Self-assign issues using `/assign-me` command (default)
- 🗑️ Self-unassign from issues using `/unassign-me` command (default)
- 👥 Maintainer-controlled assignments using `/assign @<user>` and `/unassign <@user>` commands
- 🎉 Different welcome messages for first-time contributors vs returning contributors
- ⏰ Automatic unassignment of inactive issues after configurable period (default: 7 days)
- 🛡️ Block self-reassignment after unassignment (requires maintainer approval)
- 🚫 Prevent issue authors from self-assigning their own issues (optional, for roadmap control)
- 🔔 Send reminder notifications before automatic unassignment occurs
- 🔢 Limit the maximum number of issues a user can be assigned to simultaneously (default: 3)
- 🎯 Per-label assignment limits to encourage progression from beginner to advanced issues (e.g., limit "good first issue" to 2 assignments)

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

| Name                              | Description                                                                                                                                                                                                 | Default                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `github_token`                    | PAT for GitHub API authentication. It's automatically generated when the action is running, so no need to add it into your secrets.                                                                         | `${{ github.token }}`                                                            |
| `self_assign_cmd`                 | The command that assigns the issue to the one who triggered it                                                                                                                                              | `/assign-me`                                                                     |
| `self_unassign_cmd`               | The command that unassigns the issue from the user who triggered it, if they are already assigned.                                                                                                          | `/unassign-me`                                                                   |
| `assign_user_cmd`                 | The command that assigns the user to the issue                                                                                                                                                              | `/assign @<user>`                                                                |
| `unassign_user_cmd`               | The command that unassigns the user from the issue, if they are assigned.                                                                                                                                   | `/unassign @<user>`                                                              |
| `maintainers`                     | A list of maintainers authorized to use `/assign` and `/unassign` commands. List the usernames with comma separated (i.e: 'takanome-dev,octokit'). If not set, the usage of those commands will be ignored. | `''`                                                                             |
| `enable_auto_suggestion`          | A boolean input that controls whether the action should automatically check user comments for phrases signaling interest in issue assignment. Set to true by default.                                       | **`true`**                                                                       |
| `allow_self_assign_author`        | Whether to allow the issue author to self-assign their own issue. Set to `false` to prevent users from creating issues and immediately assigning themselves, giving maintainers control over the roadmap.   | `true`                                                                           |
| `assigned_label`                  | A label that is added to issues when they're assigned, to track which issues were assigned by this action.                                                                                                  | `📍 Assigned`                                                                    |
| `required_label`                  | If set, the issue must have this label to be assigned.                                                                                                                                                      | `''`                                                                             |
| `days_until_unassign`             | The span of time between a user assigning themselves to the issue being unassigned automatically by the action.                                                                                             | `7`                                                                              |
| `pin_label`                       | A label that prevents the user from being unassigned, typically for issues that are expected to take a long time.                                                                                           | `📌 Pinned`                                                                      |
| `assigned_comment`                | The comment posted after a returning contributor (has opened a PR before) has assigned themselves to an issue.                                                                                              | Customizable                                                                     |
| `assigned_comment_newcomer`       | The comment posted after a first-time contributor (has never opened a PR) has assigned themselves to an issue. Provides a welcoming message with helpful resources for new contributors.                    | Customizable welcome message                                                     |
| `already_assigned_comment`        | The comment posted when a user tries to assign themselves to an issue that is already assigned                                                                                                              | Customizable in the workflow file you're going to create.                        |
| `already_assigned_comment_pinned` | The comment posted when a user tries to assign themselves to a pinned issue that is already assigned                                                                                                        | Customizable message for pinned issues that won't be auto-unassigned.            |
| `unassigned_comment`              | The comment posted after a user is unassigned from an issue.                                                                                                                                                | Customizable in the workflow file you're going to create.                        |
| `assignment_suggestion_comment`   | The comment posted when someone shows interest in being assigned to an issue without using the assignment commands.                                                                                         | Customizable in the workflow file you're going to create.                        |
| `block_assignment`                | Whether to block self-assignment after a user was previously unassigned.                                                                                                                                    | `true`                                                                           |
| `block_assignment_comment`        | The comment posted when a user tries to re-assign themselves after being unassigned.                                                                                                                        | Customizable message explaining that a maintainer needs to approve reassignment. |
| `enable_reminder`                 | Whether to send a reminder before automatic unassignment occurs.                                                                                                                                            | `true`                                                                           |
| `reminder_days`                   | How many days before unassignment to send a reminder. Set to 'auto' to calculate halfway point (days_until_unassign / 2)                                                                                    | `auto`                                                                           |
| `reminder_comment`                | The comment posted as a reminder before automatic unassignment.                                                                                                                                             | Customizable message warning about upcoming unassignment.                        |
| `max_assignments`                 | The maximum number of issues a user can be assigned to at once.                                                                                                                                             | `3`                                                                              |
| `max_assignments_message`         | The message posted when a user has reached their maximum assignments.                                                                                                                                       | Customizable message explaining the limit and options for managing assignments.  |
| `max_overall_assignment_labels`   | A comma-separated list of labels that share a per-label assignment limit (e.g., to limit "good first issue" assignments separately from "good second issue").                                               | `good first issue,good second issue`                                             |
| `max_overall_assignment_count`    | The maximum number of issues a user can be assigned for each label in `max_overall_assignment_labels`. Each label has its own independent limit.                                                            | `2`                                                                              |
| `max_overall_assignment_message`  | The message posted when a user has reached the per-label assignment limit.                                                                                                                                  | Customizable message encouraging progression to more advanced issues.            |
| `self_assign_author_blocked_comment` | The message posted when an issue author tries to self-assign their own issue but `allow_self_assign_author` is `false`.                                                                                  | Customizable message explaining maintainer approval is needed.                   |

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
