import { describe, expect, it, mock, beforeEach } from 'bun:test'
import { StatsService } from '../stats-service'
import type { OctokitClient } from '../../../core'

describe('StatsService', () => {
  let mockOctokit: OctokitClient
  let statsService: StatsService

  beforeEach(() => {
    mockOctokit = {
      request: mock(() =>
        Promise.resolve({ data: { total_count: 0, items: [] } }),
      ),
    } as unknown as OctokitClient

    statsService = new StatsService(mockOctokit, {
      owner: 'test-owner',
      repo: 'test-repo',
    })
  })

  describe('getContributorStats', () => {
    it('should return PR stats for a contributor', async () => {
      // Mock first call (all PRs) returns 5 total
      // Mock second call (merged PRs) returns 3 merged
      let callCount = 0
      mockOctokit.request = mock(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            data: { total_count: 5, items: [{}, {}, {}, {}, {}] },
          })
        }
        return Promise.resolve({
          data: { total_count: 3, items: [{}, {}, {}] },
        })
      }) as unknown as typeof mockOctokit.request

      const stats = await statsService.getContributorStats('testuser')

      expect(stats.prs_total).toBe(5)
      expect(stats.prs_merged).toBe(3)
      expect(stats.prs_unmerged).toBe(2)
      expect(stats.prs_merged_percentage).toBe(60)
    })

    it('should return zeros for a newcomer with no PRs', async () => {
      mockOctokit.request = mock(() =>
        Promise.resolve({
          data: { total_count: 0, items: [] },
        }),
      ) as unknown as typeof mockOctokit.request

      const stats = await statsService.getContributorStats('newuser')

      expect(stats.prs_total).toBe(0)
      expect(stats.prs_merged).toBe(0)
      expect(stats.prs_unmerged).toBe(0)
      expect(stats.prs_merged_percentage).toBe(0)
    })

    it('should calculate 0% for all unmerged PRs', async () => {
      let callCount = 0
      mockOctokit.request = mock(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            data: { total_count: 3, items: [{}, {}, {}] },
          })
        }
        return Promise.resolve({
          data: { total_count: 0, items: [] },
        })
      }) as unknown as typeof mockOctokit.request

      const stats = await statsService.getContributorStats('testuser')

      expect(stats.prs_total).toBe(3)
      expect(stats.prs_merged).toBe(0)
      expect(stats.prs_unmerged).toBe(3)
      expect(stats.prs_merged_percentage).toBe(0)
    })

    it('should calculate 100% for all merged PRs', async () => {
      let callCount = 0
      mockOctokit.request = mock(() => {
        callCount++
        return Promise.resolve({
          data: { total_count: 4, items: [{}, {}, {}, {}] },
        })
      }) as unknown as typeof mockOctokit.request

      const stats = await statsService.getContributorStats('testuser')

      expect(stats.prs_total).toBe(4)
      expect(stats.prs_merged).toBe(4)
      expect(stats.prs_unmerged).toBe(0)
      expect(stats.prs_merged_percentage).toBe(100)
    })

    it('should use correct search query format', async () => {
      const requestMock = mock(() =>
        Promise.resolve({
          data: { total_count: 0, items: [] },
        }),
      )
      mockOctokit.request = requestMock as unknown as typeof mockOctokit.request

      await statsService.getContributorStats('testuser')

      // Check that it was called with the right parameters
      expect(requestMock).toHaveBeenCalled()
      const firstCall = requestMock.mock.calls[0]
      expect(firstCall[0]).toBe('GET /search/issues')
      expect(firstCall[1].q).toContain('repo:test-owner/test-repo')
      expect(firstCall[1].q).toContain('is:pr')
      expect(firstCall[1].q).toContain('author:testuser')
    })
  })
})
