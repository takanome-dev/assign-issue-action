import * as core from '@actions/core'
import type { OctokitClient } from '../../core'
import type { RepoContext } from './issue-service'

const API_VERSION = '2022-11-28'

export interface ContributorStats {
  /** Total number of PRs by the contributor */
  prs_total: number
  /** Number of merged PRs by the contributor */
  prs_merged: number
  /** Number of unmerged PRs by the contributor */
  prs_unmerged: number
  /** Percentage of merged PRs (0-100) */
  prs_merged_percentage: number
}

export class StatsService {
  constructor(
    private readonly octokit: OctokitClient,
    private readonly repoContext: RepoContext,
  ) {}

  /**
   * Get PR statistics for a contributor in the repository
   */
  async getContributorStats(username: string): Promise<ContributorStats> {
    try {
      // Fetch all PRs by this user in the repo
      const allPrs = await this.searchPullRequests(
        `is:pr author:${username}`,
      )
      
      // Fetch merged PRs by this user
      const mergedPrs = await this.searchPullRequests(
        `is:pr author:${username} is:merged`,
      )

      const total = allPrs.total_count
      const merged = mergedPrs.total_count
      const unmerged = total - merged
      const percentage = total > 0 ? Math.round((merged / total) * 100) : 0

      return {
        prs_total: total,
        prs_merged: merged,
        prs_unmerged: unmerged,
        prs_merged_percentage: percentage,
      }
    } catch (error) {
      core.warning(`Failed to fetch PR stats for @${username}: ${error}`)
      // Return zeros if we can't fetch stats
      return {
        prs_total: 0,
        prs_merged: 0,
        prs_unmerged: 0,
        prs_merged_percentage: 0,
      }
    }
  }

  /**
   * Search for pull requests
   */
  private async searchPullRequests(
    query: string,
  ): Promise<{ total_count: number; items: unknown[] }> {
    const { owner, repo } = this.repoContext
    const fullQuery = `repo:${owner}/${repo} ${query}`

    const response = await this.octokit.request('GET /search/issues', {
      q: fullQuery,
      advanced_search: 'true',
      headers: {
        'X-GitHub-Api-Version': API_VERSION,
      },
    })

    return response.data
  }
}
