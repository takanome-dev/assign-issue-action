import mustache from 'mustache'
import type { OctokitClient } from '../../core'
import type { RepoContext } from './issue-service'

const API_VERSION = '2022-11-28'

export class CommentService {
  constructor(
    private readonly octokit: OctokitClient,
    private readonly repoContext: RepoContext,
  ) {}

  /**
   * Create a comment on an issue with optional mustache templating
   */
  async createComment(issueNumber: number, body: string): Promise<void> {
    await this.octokit.request(
      'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
      {
        owner: this.repoContext.owner,
        repo: this.repoContext.repo,
        issue_number: issueNumber,
        body,
        headers: {
          'X-GitHub-Api-Version': API_VERSION,
        },
      },
    )
  }

  /**
   * Create a comment using a mustache template
   */
  async createTemplatedComment<T extends Record<string, unknown>>(
    issueNumber: number,
    template: string,
    data: T,
  ): Promise<void> {
    const body = mustache.render(template, data)
    await this.createComment(issueNumber, body)
  }

  /**
   * Render a mustache template without posting (useful for checking content)
   */
  renderTemplate<T extends Record<string, unknown>>(
    template: string,
    data: T,
  ): string {
    return mustache.render(template, data)
  }
}
