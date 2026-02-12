# Testing Scripts

This directory contains scripts to help test and debug the assign-issue-action locally before deploying.

## debug-stats.ts

A TypeScript script to debug PR statistics retrieval issues. This is useful when the `{{ prs_total }}`, `{{ prs_merged }}`, etc. placeholders in `assigned_comment` are not being populated.

### Usage

```bash
# Set your GitHub token
export GITHUB_TOKEN=your_github_token_here

# Run the debug script
bun scripts/debug-stats.ts
```

### What it tests

1. **Search API for all PRs**: Tests `repo:owner/repo is:pr author:username`
2. **Search API for merged PRs**: Tests `repo:owner/repo is:pr author:username is:merged`
3. **Alternative pulls endpoint**: Lists PRs directly via the pulls API
4. **Rate limit status**: Shows remaining API quota

### Expected output

If working correctly:
```
🔍 Debugging PR Stats Retrieval
==================================================
Repository: JabRef/jabref
Username: LoayTarek5
Issue: #15033

Test 1: Search for ALL PRs by user
  Query: repo:JabRef/jabref is:pr author:LoayTarek5
  ✅ Success! Total count: 5

Test 2: Search for MERGED PRs by user
  Query: repo:JabRef/jabref is:pr author:LoayTarek5 is:merged
  ✅ Success! Total count: 3
...
```

If stats show 0 when they shouldn't:
- Check your token has `repo` or `public_repo` scope
- Check rate limits (search API has stricter limits)
- Verify the user actually has PRs in the target repo

## debug-stats-curl.sh

A simpler bash/curl version of the debug script for quick testing without dependencies.

### Usage

```bash
export GITHUB_TOKEN=your_github_token_here
./scripts/debug-stats-curl.sh
```

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
