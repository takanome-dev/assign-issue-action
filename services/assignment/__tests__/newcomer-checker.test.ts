import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { NewcomerChecker } from '../newcomer-checker'

// Mock @actions/core
mock.module('@actions/core', () => ({
  warning: mock(() => {}),
}))

const mockIssueService = {
  searchIssues: mock(() => Promise.resolve({ total_count: 0, items: [] })),
} as any

describe('NewcomerChecker', () => {
  let checker: NewcomerChecker

  beforeEach(() => {
    mockIssueService.searchIssues.mockClear()
    mockIssueService.searchIssues.mockResolvedValue({ total_count: 0, items: [] })
    checker = new NewcomerChecker(mockIssueService)
  })

  describe('isNewcomer', () => {
    it('should return true when user has no PRs', async () => {
      mockIssueService.searchIssues.mockResolvedValueOnce({
        total_count: 0,
        items: [],
      })

      const result = await checker.isNewcomer('new-user')

      expect(result).toBe(true)
      expect(mockIssueService.searchIssues).toHaveBeenCalledWith(
        'is:pr author:new-user',
      )
    })

    it('should return false when user has PRs', async () => {
      mockIssueService.searchIssues.mockResolvedValueOnce({
        total_count: 5,
        items: [{}, {}, {}, {}, {}],
      })

      const result = await checker.isNewcomer('existing-contributor')

      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      mockIssueService.searchIssues.mockRejectedValueOnce(new Error('API Error'))

      const result = await checker.isNewcomer('user')

      expect(result).toBe(false)
    })
  })
})
