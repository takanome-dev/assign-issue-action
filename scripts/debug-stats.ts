#!/usr/bin/env bun
/**
 * Debug script for PR stats retrieval
 * Usage: bun scripts/debug-stats.ts
 *
 * This script simulates the stats service logic with detailed logging
 * to help debug why PR stats are returning 0.
 */

import { Octokit } from '@octokit/core'
import { throttling } from '@octokit/plugin-throttling'

const ThrottledOctokit = Octokit.plugin(throttling)

// Test configuration - matches the issue report
const TEST_CONFIG = {
  owner: 'JabRef',
  repo: 'jabref',
  username: 'LoayTarek5',
  issueNumber: 15033,
}

// GitHub token from environment
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN environment variable is required')
  console.error('   Run: export GITHUB_TOKEN=your_token_here')
  process.exit(1)
}

async function debugStats() {
  console.log('🔍 Debugging PR Stats Retrieval')
  console.log('=' .repeat(50))
  console.log(`Repository: ${TEST_CONFIG.owner}/${TEST_CONFIG.repo}`)
  console.log(`Username: ${TEST_CONFIG.username}`)
  console.log(`Issue: #${TEST_CONFIG.issueNumber}`)
  console.log('')

  const octokit = new ThrottledOctokit({
    auth: GITHUB_TOKEN,
    throttle: {
      onRateLimit: (retryAfter: number, options: any, _octokit: any, retryCount: number) => {
        console.warn(`⚠️ Rate limit hit for ${options.method} ${options.url}`)
        if (retryCount < 1) {
          console.warn(`   Retrying after ${retryAfter} seconds...`)
          return true
        }
        return false
      },
      onSecondaryRateLimit: (retryAfter: number, options: any) => {
        console.warn(`⚠️ Secondary rate limit for ${options.method} ${options.url}`)
      },
    },
  })

  const API_VERSION = '2022-11-28'

  // Test 1: Search for all PRs by user in repo
  const allPrsQuery = `repo:${TEST_CONFIG.owner}/${TEST_CONFIG.repo} is:pr author:${TEST_CONFIG.username}`
  console.log('Test 1: Search for ALL PRs by user')
  console.log(`  Query: ${allPrsQuery}`)

  try {
    const allPrsResponse = await octokit.request('GET /search/issues', {
      q: allPrsQuery,
      advanced_search: 'true',
      headers: {
        'X-GitHub-Api-Version': API_VERSION,
      },
    })

    console.log(`  ✅ Success! Total count: ${allPrsResponse.data.total_count}`)
    console.log(`  Items found: ${allPrsResponse.data.items.length}`)

    if (allPrsResponse.data.items.length > 0) {
      console.log('  Sample PR:')
      const item = allPrsResponse.data.items[0] as any
      console.log(`    - #${item.number}: ${item.title}`)
      console.log(`    - State: ${item.state}`)
      console.log(`    - URL: ${item.html_url}`)
    }
  } catch (error: any) {
    console.error(`  ❌ Failed: ${error.message}`)
    if (error.response) {
      console.error(`     Status: ${error.response.status}`)
      console.error(`     Message: ${JSON.stringify(error.response.data)}`)
    }
  }

  console.log('')

  // Test 2: Search for merged PRs by user
  const mergedPrsQuery = `repo:${TEST_CONFIG.owner}/${TEST_CONFIG.repo} is:pr author:${TEST_CONFIG.username} is:merged`
  console.log('Test 2: Search for MERGED PRs by user')
  console.log(`  Query: ${mergedPrsQuery}`)

  try {
    const mergedPrsResponse = await octokit.request('GET /search/issues', {
      q: mergedPrsQuery,
      advanced_search: 'true',
      headers: {
        'X-GitHub-Api-Version': API_VERSION,
      },
    })

    console.log(`  ✅ Success! Total count: ${mergedPrsResponse.data.total_count}`)
    console.log(`  Items found: ${mergedPrsResponse.data.items.length}`)
  } catch (error: any) {
    console.error(`  ❌ Failed: ${error.message}`)
    if (error.response) {
      console.error(`     Status: ${error.response.status}`)
      console.error(`     Message: ${JSON.stringify(error.response.data)}`
)
    }
  }

  console.log('')

  // Test 3: Direct API check - list user's PRs
  console.log('Test 3: List PRs via pulls endpoint (alternative method)')
  try {
    const pullsResponse = await octokit.request('GET /repos/{owner}/{repo}/pulls', {
      owner: TEST_CONFIG.owner,
      repo: TEST_CONFIG.repo,
      state: 'all',
      per_page: 100,
      headers: {
        'X-GitHub-Api-Version': API_VERSION,
      },
    })

    const userPrs = pullsResponse.data.filter((pr: any) => pr.user?.login === TEST_CONFIG.username)
    console.log(`  ✅ Found ${userPrs.length} PRs by ${TEST_CONFIG.username} (out of ${pullsResponse.data.length} total)`)

    if (userPrs.length > 0) {
      console.log('  User PRs:')
      userPrs.slice(0, 5).forEach((pr: any) => {
        console.log(`    - #${pr.number}: ${pr.title} (${pr.state})`)
      })
    }
  } catch (error: any) {
    console.error(`  ❌ Failed: ${error.message}`)
  }

  console.log('')

  // Test 4: Check rate limit status
  console.log('Test 4: Rate Limit Status')
  try {
    const rateLimitResponse = await octokit.request('GET /rate_limit', {
      headers: {
        'X-GitHub-Api-Version': API_VERSION,
      },
    })

    const searchLimit = rateLimitResponse.data.resources.search
    console.log(`  Search API:`)
    console.log(`    - Limit: ${searchLimit.limit}`)
    console.log(`    - Remaining: ${searchLimit.remaining}`)
    console.log(`    - Resets at: ${new Date(searchLimit.reset * 1000).toLocaleString()}`)

    const coreLimit = rateLimitResponse.data.resources.core
    console.log(`  Core API:`)
    console.log(`    - Limit: ${coreLimit.limit}`)
    console.log(`    - Remaining: ${coreLimit.remaining}`)
    console.log(`    - Resets at: ${new Date(coreLimit.reset * 1000).toLocaleString()}`)
  } catch (error: any) {
    console.error(`  ❌ Failed: ${error.message}`)
  }

  console.log('')
  console.log('=' .repeat(50))
  console.log('🔍 Debug Complete')
  console.log('')
  console.log('Common issues:')
  console.log('  1. Token lacks permissions - ensure GITHUB_TOKEN has repo scope')
  console.log('  2. Search API rate limits are low (10 requests/min for unauthenticated)')
  console.log('  3. Repository might be using GitHub Enterprise with different search behavior')
  console.log('  4. The user might not have any PRs in the target repository')
}

debugStats().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
