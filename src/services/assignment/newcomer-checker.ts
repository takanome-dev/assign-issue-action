import * as core from '@actions/core'
import type { IssueService } from '../github'

export class NewcomerChecker {
  constructor(private readonly issueService: IssueService) {}

  /**
   * Check if a user is a newcomer (has never opened a PR in this repo)
   */
  async isNewcomer(username: string): Promise<boolean> {
    try {
      const result = await this.issueService.searchIssues(
        `is:pr author:${username}`,
      )
      return result.total_count === 0
    } catch (error) {
      core.warning(`Failed to check PR history for @${username}: ${error}`)
      // Default to not a newcomer if we can't check
      return false
    }
  }
}
