#!/usr/bin/env bun
/**
 * Debug script that runs the actual StatsService code
 * This simulates exactly what the action does internally
 */

import { StatsService } from '../services/github/stats-service'
import { createOctokitClient } from '../core/octokit-client'

// Test configuration - matches the issue report
const TEST_CONFIG = {
  owner: 'JabRef',
  repo: 'jabref',
  username: 'LoayTarek5',
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN environment variable is required')
  process.exit(1)
}

async function debugRealStatsService() {
  console.log('🔍 Debugging with REAL StatsService')
  console.log('=' .repeat(50))
  console.log(`Repository: ${TEST_CONFIG.owner}/${TEST_CONFIG.repo}`)
  console.log(`Username: ${TEST_CONFIG.username}`)
  console.log('')

  const octokit = createOctokitClient(GITHUB_TOKEN)

  const statsService = new StatsService(octokit, {
    owner: TEST_CONFIG.owner,
    repo: TEST_CONFIG.repo,
  })

  console.log('Calling statsService.getContributorStats()...')
  console.log('')

  try {
    const stats = await statsService.getContributorStats(TEST_CONFIG.username)

    console.log('✅ Stats returned:')
    console.log(`  prs_total: ${stats.prs_total}`)
    console.log(`  prs_merged: ${stats.prs_merged}`)
    console.log(`  prs_unmerged: ${stats.prs_unmerged}`)
    console.log(`  prs_merged_percentage: ${stats.prs_merged_percentage}`)

    // Simulate template rendering
    console.log('')
    console.log('Template rendering simulation:')
    const templateData = {
      handle: TEST_CONFIG.username,
      total_days: 21,
      unassigned_date: '01 March 2025',
      pin_label: '📌 Pinned',
      prs_total: stats.prs_total,
      prs_merged: stats.prs_merged,
      prs_unmerged: stats.prs_unmerged,
      prs_merged_percentage: stats.prs_merged_percentage,
    }

    console.log(`  "you have raised ${templateData.prs_total} pull requests of which ${templateData.prs_merged_percentage}% (${templateData.prs_merged}) have been merged."`)

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  }

  console.log('')
  console.log('=' .repeat(50))
}

debugRealStatsService().catch(console.error)
