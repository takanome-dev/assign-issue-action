import * as core from '@actions/core'
import type { OctokitClient } from '../../core'
import type { RepoContext } from './issue-service'

const API_VERSION = '2022-11-28'

export interface PullRequest {
  number: number
  title: string
  url: string
  state: 'merged' | 'open' | 'closed'
}

export interface ContributorStats {
  prs_total: number
  prs_merged: number
  prs_unmerged: number
  prs_merged_percentage: number
  prs: PullRequest[]
  prs_link: string
}

export class StatsService {
  constructor(
    private readonly octokit: OctokitClient,
    private readonly repoContext: RepoContext,
  ) {}

  async getContributorStats(username: string): Promise<ContributorStats> {
    try {
      const allPrs = await this.searchPullRequests(`is:pr author:${username}`)

      const mergedPrs = await this.searchPullRequests(
        `is:pr author:${username} is:merged`,
      )

      const total = allPrs.total_count
      const merged = mergedPrs.total_count
      const unmerged = total - merged
      const percentage = total > 0 ? Math.round((merged / total) * 100) : 0

      // Extract PR details and sort by created_at descending (newest first)
      interface SearchItem {
        number: number
        title: string
        html_url: string
        created_at: string
        state: string
      }

      const mergedPrNumbers = new Set(
        (mergedPrs.items as SearchItem[]).map((item) => item.number),
      )

      const prs = (allPrs.items as SearchItem[])
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 5)
        .map((item) => ({
          number: item.number,
          title: item.title,
          url: item.html_url,
          state: (mergedPrNumbers.has(item.number)
            ? 'merged'
            : item.state) as PullRequest['state'],
        }))

      const prsLink = `https://github.com/${this.repoContext.owner}/${this.repoContext.repo}/pulls?q=is%3Apr+author%3A${username}`

      return {
        prs_total: total,
        prs_merged: merged,
        prs_unmerged: unmerged,
        prs_merged_percentage: percentage,
        prs,
        prs_link: prsLink,
      }
    } catch (error) {
      core.warning(`Failed to fetch PR stats for @${username}: ${error}`)
      return {
        prs_total: 0,
        prs_merged: 0,
        prs_unmerged: 0,
        prs_merged_percentage: 0,
        prs: [],
        prs_link: `https://github.com/${this.repoContext.owner}/${this.repoContext.repo}/pulls?q=is%3Apr+author%3A${username}`,
      }
    }
  }

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
