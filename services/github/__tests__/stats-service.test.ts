import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { OctokitClient } from '../../../core'
import { StatsService } from '../stats-service'

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
            data: {
              total_count: 5,
              items: [
                {
                  number: 5,
                  title: 'PR 5',
                  html_url: 'http://test.com/5',
                  created_at: '2024-03-25',
                },
                {
                  number: 4,
                  title: 'PR 4',
                  html_url: 'http://test.com/4',
                  created_at: '2024-03-24',
                },
                {
                  number: 3,
                  title: 'PR 3',
                  html_url: 'http://test.com/3',
                  created_at: '2024-03-23',
                },
                {
                  number: 2,
                  title: 'PR 2',
                  html_url: 'http://test.com/2',
                  created_at: '2024-03-22',
                },
                {
                  number: 1,
                  title: 'PR 1',
                  html_url: 'http://test.com/1',
                  created_at: '2024-03-21',
                },
              ],
            },
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
      expect(stats.prs).toHaveLength(5)
      expect(stats.prs[0].number).toBe(5)
      expect(stats.prs[0].title).toBe('PR 5')
      expect(stats.prs[0].url).toBe('http://test.com/5')
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
      expect(stats.prs).toHaveLength(0)
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

    it('should limit PRs to 5 most recent', async () => {
      mockOctokit.request = mock(() =>
        Promise.resolve({
          data: {
            total_count: 10,
            items: [
              {
                number: 1,
                title: 'Oldest PR',
                html_url: 'http://test.com/1',
                created_at: '2024-03-20',
              },
              {
                number: 2,
                title: 'PR 2',
                html_url: 'http://test.com/2',
                created_at: '2024-03-21',
              },
              {
                number: 3,
                title: 'PR 3',
                html_url: 'http://test.com/3',
                created_at: '2024-03-22',
              },
              {
                number: 4,
                title: 'PR 4',
                html_url: 'http://test.com/4',
                created_at: '2024-03-23',
              },
              {
                number: 5,
                title: 'PR 5',
                html_url: 'http://test.com/5',
                created_at: '2024-03-24',
              },
              {
                number: 6,
                title: 'PR 6',
                html_url: 'http://test.com/6',
                created_at: '2024-03-25',
              },
              {
                number: 7,
                title: 'Newest PR',
                html_url: 'http://test.com/7',
                created_at: '2024-03-26',
              },
            ],
          },
        }),
      ) as unknown as typeof mockOctokit.request

      const stats = await statsService.getContributorStats('testuser')

      expect(stats.prs).toHaveLength(5)
      expect(stats.prs[0].number).toBe(7) // Newest first
      expect(stats.prs[4].number).toBe(3) // 5th most recent
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
