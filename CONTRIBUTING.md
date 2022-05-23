# Contributing

Thank you so much for your interest in contributing!. All types of contributions are encouraged and valued.
Please read the [CODE of CONDUCT](../../../../../../CODE_OF_CONDUCT.md).

## Setting Up Your Code

First, fork the repository to your own account and run the following command:

- Clone your repo: `git clone https://github.com/<your_name>/assign-to-me-action`
- Change directory to the working dir: `cd assign-to-me-action`
- Make sure that your forked version is up to date: `git fetch upstream` & `git merge upstream/master` & `git push`
- Install the dependencies: `npm ci`

## Claiming an Issue

If you see an open issue you would like to work on, just comment `/assign-to-me` and the action will do the job 😉
Issues that are not assigned are assumed open, and to avoid conflicts, please assign yourself before beginning work on any issues.

> [!NOTE]
> Assigned issues that have not had any activity in a week will be unassigned by the action.

Next, use `git checkout -b <branch_name>` to create a new branch for your work. It's always a good idea to avoid committing changes directly to your `master` branch - this keeps it clean and avoid some weird issues.

Branch names should be a brief description of your changes, such as `fix-typo` for fixing a typo.

> [!Important]
> In order to make git commit messages easier to read and faster to reason about, we follow some guidelines on most commits to keep the format predictable. Check [Conventional Commits specification](https://www.conventionalcommits.org/) for more information about our guidelines.

## Testing Changes

- Confirm that a project successfully compiles: `npm run build`
- Ensure that the code style is correct: `npm run lint`
- Confirm that the project start successfully: `npm start`
- Ensure that the unit and functional tests all pass: `npm test`

## Submitting a Pull Request

Push your changes to your forked repository by using `git push -u origin <branch_name>`.

- `-u` tells `git` to set the upstream, it's the same as `--set-upstream`
- `origin` tells `git` to push to your fork
- `branch_name` tells `git` to push to a branch - this MUST match the name of the branch you created locally.

Make sure to change the PR title in something like: `fix: correct typo` or `feat: add node 18`

## Pull Request Reviews

All pull requests require a review before being merged. Most reviews will come from [@takanome_dev](https://github.com/TAKANOME-DEV).

If your pull request is approved, it will be merged.

If your pull request requires additional changes or information, we ask that you apply the changes promptly.

Contributions with outstanding change requests that receive no activity within a week will be closed as stale.

## License​

By contributing to this project, you agree that your contributions will be licensed under its GNU AFFERO GENERAL PUBLIC LICENSE.
