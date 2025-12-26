import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { TeamService } from '../team-service'

// Mock @actions/core
mock.module('@actions/core', () => ({
  warning: mock(() => {}),
}))

const mockRequest = mock(() => Promise.resolve({ data: [] }))

const mockOctokit = {
  request: mockRequest,
} as any

describe('TeamService', () => {
  let service: TeamService

  beforeEach(() => {
    mockRequest.mockClear()
    mockRequest.mockResolvedValue({ data: [] })
    service = new TeamService(mockOctokit)
  })

  describe('getTeamMembers', () => {
    it('should call the correct API endpoint', async () => {
      mockRequest.mockResolvedValueOnce({
        data: [{ login: 'user1' }, { login: 'user2' }],
      })

      const members = await service.getTeamMembers('my-org', 'my-team')

      expect(mockRequest).toHaveBeenCalledWith(
        'GET /orgs/{org}/teams/{team_slug}/members',
        {
          org: 'my-org',
          team_slug: 'my-team',
        },
      )
      expect(members).toEqual(['user1', 'user2'])
    })

    it('should return empty array on error', async () => {
      mockRequest.mockRejectedValueOnce(new Error('Not found'))

      const members = await service.getTeamMembers('org', 'nonexistent')

      expect(members).toEqual([])
    })
  })

  describe('resolveMaintainers', () => {
    it('should return individual usernames as-is', async () => {
      const result = await service.resolveMaintainers(['user1', 'user2'])

      expect(result).toEqual(['user1', 'user2'])
      expect(mockRequest).not.toHaveBeenCalled()
    })

    it('should resolve team references', async () => {
      mockRequest.mockResolvedValueOnce({
        data: [{ login: 'team-member1' }, { login: 'team-member2' }],
      })

      const result = await service.resolveMaintainers(['@my-org/my-team'])

      expect(result).toEqual(['team-member1', 'team-member2'])
    })

    it('should handle mixed usernames and team references', async () => {
      mockRequest.mockResolvedValueOnce({
        data: [{ login: 'team-member' }],
      })

      const result = await service.resolveMaintainers([
        'individual-user',
        '@org/team',
      ])

      expect(result).toContain('individual-user')
      expect(result).toContain('team-member')
    })

    it('should deduplicate members', async () => {
      mockRequest.mockResolvedValueOnce({
        data: [{ login: 'user1' }],
      })

      const result = await service.resolveMaintainers([
        'user1',
        '@org/team', // also contains user1
      ])

      expect(result).toEqual(['user1'])
    })
  })

  describe('isMaintainer', () => {
    it('should return true for individual maintainer', async () => {
      const result = await service.isMaintainer('user1', ['user1', 'user2'])

      expect(result).toBe(true)
    })

    it('should return false for non-maintainer', async () => {
      const result = await service.isMaintainer('stranger', ['user1', 'user2'])

      expect(result).toBe(false)
    })

    it('should return true for team member', async () => {
      mockRequest.mockResolvedValueOnce({
        data: [{ login: 'team-user' }],
      })

      const result = await service.isMaintainer('team-user', ['@org/team'])

      expect(result).toBe(true)
    })
  })
})
