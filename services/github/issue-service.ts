import type { OctokitClient } from '../../core'

const API_VERSION = '2022-11-28'

export interface RepoContext {
  owner: string
  repo: string
}

export class IssueService {
  constructor(
    private readonly octokit: OctokitClient,
    private readonly repoContext: RepoContext,
  ) {}

  async addAssignee(issueNumber: number, username: string): Promise<void> {
    await this.octokit.request(
      'POST /repos/{owner}/{repo}/issues/{issue_number}/assignees',
      {
        owner: this.repoContext.owner,
        repo: this.repoContext.repo,
        issue_number: issueNumber,
        assignees: [username],
        headers: {
          'X-GitHub-Api-Version': API_VERSION,
        },
      },
    )
  }

  async removeAssignee(issueNumber: number, username: string): Promise<void> {
    await this.octokit.request(
      'DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees',
      {
        owner: this.repoContext.owner,
        repo: this.repoContext.repo,
        issue_number: issueNumber,
        assignees: [username],
        headers: {
          'X-GitHub-Api-Version': API_VERSION,
        },
      },
    )
  }

  async addLabel(issueNumber: number, label: string): Promise<void> {
    await this.octokit.request(
      'POST /repos/{owner}/{repo}/issues/{issue_number}/labels',
      {
        owner: this.repoContext.owner,
        repo: this.repoContext.repo,
        issue_number: issueNumber,
        labels: [label],
        headers: {
          'X-GitHub-Api-Version': API_VERSION,
        },
      },
    )
  }

  async removeLabel(issueNumber: number, label: string): Promise<void> {
    try {
      await this.octokit.request(
        'DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}',
        {
          owner: this.repoContext.owner,
          repo: this.repoContext.repo,
          issue_number: issueNumber,
          name: label,
          headers: {
            'X-GitHub-Api-Version': API_VERSION,
          },
        },
      )
    } catch {
      // Label might not exist, ignore error
    }
  }

  async getComments(issueNumber: number): Promise<Array<{ body?: string }>> {
    const response = await this.octokit.request(
      'GET /repos/{owner}/{repo}/issues/{issue_number}/comments',
      {
        owner: this.repoContext.owner,
        repo: this.repoContext.repo,
        issue_number: issueNumber,
        headers: {
          'X-GitHub-Api-Version': API_VERSION,
        },
      },
    )
    return response.data
  }

  async searchIssues(
    query: string,
  ): Promise<{ total_count: number; items: unknown[] }> {
    const { owner, repo } = this.repoContext
    const fullQuery = `repo:${owner}/${repo} ${query}`

    const response = await this.octokit.request('GET /search/issues', {
      q: fullQuery,
      advanced_search: true,
      headers: {
        'X-GitHub-Api-Version': API_VERSION,
      },
    })

    return response.data
  }

  async getAssignmentCount(username: string): Promise<number> {
    const result = await this.searchIssues(
      `is:issue is:open assignee:${username}`,
    )
    return result.items.length
  }

  async getAssignmentCountPerLabel(
    username: string,
    labels: string[],
  ): Promise<Map<string, number>> {
    const labelCounts = new Map<string, number>()

    if (labels.length === 0) return labelCounts

    for (const label of labels) {
      const result = await this.searchIssues(
        `is:issue assignee:${username} label:"${label}"`,
      )
      labelCounts.set(label, result.total_count || 0)
    }

    return labelCounts
  }

  /**
   * Assign user and add label in parallel
   */
  async assignWithLabel(
    issueNumber: number,
    username: string,
    label: string,
  ): Promise<void> {
    await Promise.all([
      this.addAssignee(issueNumber, username),
      this.addLabel(issueNumber, label),
    ])
  }

  /**
   * Remove assignee and labels in parallel (for unassignment)
   */
  async unassignWithLabels(
    issueNumber: number,
    username: string,
    labelsToRemove: string[],
  ): Promise<PromiseSettledResult<void>[]> {
    return Promise.allSettled([
      this.removeAssignee(issueNumber, username),
      ...labelsToRemove.map((label) => this.removeLabel(issueNumber, label)),
    ])
  }
}
