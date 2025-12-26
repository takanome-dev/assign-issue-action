import * as core from '@actions/core'
import type { OctokitClient } from '../../core'

export class TeamService {
  constructor(private readonly octokit: OctokitClient) {}

  /**
   * Get members of a GitHub team
   */
  async getTeamMembers(org: string, teamSlug: string): Promise<string[]> {
    try {
      const response = await this.octokit.request(
        'GET /orgs/{org}/teams/{team_slug}/members',
        {
          org,
          team_slug: teamSlug,
        },
      )
      return response.data.map((m: { login: string }) => m.login)
    } catch (error) {
      core.warning(
        `Failed to fetch members for team @${org}/${teamSlug}. Ensure the token has read:org permissions. Error: ${error}`,
      )
      return []
    }
  }

  /**
   * Resolve a list of maintainers that may include team references
   * Team references use format: @org/team-name
   *
   * @param maintainers - Array of usernames or team references
   * @returns Array of resolved usernames
   */
  async resolveMaintainers(maintainers: string[]): Promise<string[]> {
    const resolvedMaintainers = new Set<string>()

    for (const maintainer of maintainers) {
      if (maintainer.startsWith('@') && maintainer.includes('/')) {
        // Team reference: @org/team-name
        const [org, team] = maintainer.substring(1).split('/')
        const members = await this.getTeamMembers(org, team)
        for (const member of members) {
          resolvedMaintainers.add(member)
        }
      } else {
        // Individual username
        resolvedMaintainers.add(maintainer)
      }
    }

    return Array.from(resolvedMaintainers)
  }

  /**
   * Check if a user is in the maintainers list (resolving teams if needed)
   */
  async isMaintainer(
    username: string,
    maintainers: string[],
  ): Promise<boolean> {
    const resolved = await this.resolveMaintainers(maintainers)
    return resolved.includes(username)
  }
}
