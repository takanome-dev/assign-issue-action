#!/bin/bash
#
# Quick curl-based debug script for PR stats
# Usage: GITHUB_TOKEN=your_token ./scripts/debug-stats-curl.sh
#

set -e

OWNER="JabRef"
REPO="jabref"
USERNAME="LoayTarek5"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ GITHUB_TOKEN environment variable is required"
  echo "   Run: export GITHUB_TOKEN=your_token_here"
  exit 1
fi

echo "🔍 Testing GitHub Search API for PR stats"
echo "=========================================="
echo "Repository: $OWNER/$REPO"
echo "Username: $USERNAME"
echo ""

# Test 1: Search for all PRs by user
echo "Test 1: Search for ALL PRs by $USERNAME"
QUERY="repo:$OWNER/$REPO+is:pr+author:$USERNAME"
echo "  Query: $QUERY"

RESPONSE=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/search/issues?q=$QUERY")

echo "  Response:"
echo "$RESPONSE" | jq '. | {total_count, incomplete_results}' 2>/dev/null || echo "$RESPONSE"
echo ""

# Test 2: Search for merged PRs
echo "Test 2: Search for MERGED PRs by $USERNAME"
MERGED_QUERY="repo:$OWNER/$REPO+is:pr+author:$USERNAME+is:merged"
echo "  Query: $MERGED_QUERY"

MERGED_RESPONSE=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/search/issues?q=$MERGED_QUERY")

echo "  Response:"
echo "$MERGED_RESPONSE" | jq '. | {total_count, incomplete_results}' 2>/dev/null || echo "$MERGED_RESPONSE"
echo ""

# Test 3: Check rate limit
echo "Test 3: Rate Limit Status"
RATE_LIMIT=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/rate_limit)

echo "  Search API:"
echo "$RATE_LIMIT" | jq '.resources.search | {limit, remaining, reset}' 2>/dev/null || echo "$RATE_LIMIT"
echo ""

echo "=========================================="
echo "Done!"
