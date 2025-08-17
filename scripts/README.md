# Testing Scripts

This directory contains scripts to help test and debug the assign-issue-action locally before deploying.

## test-action.js

A CLI tool to test the action's search queries and logic without running the full GitHub Action.

### Usage

```bash
# Test search queries (default command)
GITHUB_TOKEN=your_token npm run test:search

# Test unassignment logic
GITHUB_TOKEN=your_token npm run test:unassign

# Show help
npm run test:help
```

### Environment Variables

| Variable              | Description              | Default       |
| --------------------- | ------------------------ | ------------- |
| `GITHUB_TOKEN`        | GitHub token (required)  | -             |
| `GITHUB_OWNER`        | Repository owner         | `JabRef`      |
| `GITHUB_REPO`         | Repository name          | `jabref`      |
| `ASSIGNED_LABEL`      | Assigned label           | `📍 Assigned` |
| `EXEMPT_LABEL`        | Exempt/pinned label      | `📌 Pinned`   |
| `DAYS_UNTIL_UNASSIGN` | Days until auto-unassign | `21`          |

### What it tests

The search command tests each filter step by step to identify where the search query might be failing:

1. **Basic assigned issues**: `repo:owner/repo is:open label:"📍 Assigned"`
2. **With assignee**: Adds `assignee:*`
3. **Excluding exempt label**: Adds `-label:"📌 Pinned"`
4. **Excluding reminder-sent**: Adds `-label:"🔔 reminder-sent"`
5. **With timestamp filter**: Adds `updated:<=YYYY-MM-DD`

This helps identify which filter is causing issues to be excluded from the final result.

### Example output

```
🔧 Testing assign-issue-action search queries
📊 Configuration: { owner: 'JabRef', repo: 'jabref', ... }
⏱️ Unassign after 21 days, remind after 10 days
📅 Timestamp for filtering (10 days ago): 2024-01-15

🔍 Step 1: Basic assigned issues
Query: repo:JabRef/jabref is:open label:"📍 Assigned"
Results: 52 issues

🔍 Step 2: With assignee
Query: repo:JabRef/jabref is:open label:"📍 Assigned" assignee:*
Results: 52 issues

🔍 Step 3: Excluding exempt label
Query: repo:JabRef/jabref is:open label:"📍 Assigned" assignee:* -label:"📌 Pinned"
Results: 50 issues

🔍 Step 4: Excluding reminder-sent
Query: repo:JabRef/jabref is:open label:"📍 Assigned" assignee:* -label:"📌 Pinned" -label:"🔔 reminder-sent"
Results: 45 issues

🔍 Step 5: With timestamp filter (final query)
Query: repo:JabRef/jabref is:open label:"📍 Assigned" assignee:* -label:"📌 Pinned" -label:"🔔 reminder-sent" updated:<=2024-01-15
Results: 0 issues
```

This would show that the timestamp filter is the problem, indicating that all assigned issues have been updated within the last 10 days.

## Debugging Common Issues

### No issues found despite manual search showing results

1. **Check label names**: Ensure the label names match exactly (including emojis)
2. **Check timestamp format**: GitHub search might be sensitive to timestamp format
3. **Check for recent activity**: Issues might have been updated recently
4. **Check for exempt labels**: Issues might have pinned/exempt labels

### Rate limiting

The script includes throttling protection, but if you hit rate limits:

- Wait a few minutes before retrying
- Use a personal access token with appropriate permissions
- Reduce the number of API calls by commenting out some debug steps
