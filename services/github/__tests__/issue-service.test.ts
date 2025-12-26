import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { IssueService, type RepoContext } from '../issue-service'

const mockRequest = mock(() => Promise.resolve({ data: [] }))

const mockOctokit = {
  request: mockRequest,
} as any

const repoContext: RepoContext = {
  owner: 'test-owner',
  repo: 'test-repo',
}

describe('IssueService', () => {
  let service: IssueService

  beforeEach(() => {
    mockRequest.mockClear()
    mockRequest.mockResolvedValue({ data: [] })
    service = new IssueService(mockOctokit, repoContext)
  })

  describe('addAssignee', () => {
    it('should call the correct API endpoint', async () => {
      await service.addAssignee(123, 'testuser')

      expect(mockRequest).toHaveBeenCalledWith(
        'POST /repos/{owner}/{repo}/issues/{issue_number}/assignees',
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          issue_number: 123,
          assignees: ['testuser'],
        }),
      )
    })
  })

  describe('removeAssignee', () => {
    it('should call the correct API endpoint', async () => {
      await service.removeAssignee(123, 'testuser')

      expect(mockRequest).toHaveBeenCalledWith(
        'DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees',
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          issue_number: 123,
          assignees: ['testuser'],
        }),
      )
    })
  })

  describe('addLabel', () => {
    it('should call the correct API endpoint', async () => {
      await service.addLabel(123, 'bug')

      expect(mockRequest).toHaveBeenCalledWith(
        'POST /repos/{owner}/{repo}/issues/{issue_number}/labels',
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          issue_number: 123,
          labels: ['bug'],
        }),
      )
    })
  })

  describe('removeLabel', () => {
    it('should call the correct API endpoint', async () => {
      await service.removeLabel(123, 'bug')

      expect(mockRequest).toHaveBeenCalledWith(
        'DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}',
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          issue_number: 123,
          name: 'bug',
        }),
      )
    })

    it('should not throw when label does not exist', async () => {
      mockRequest.mockRejectedValueOnce(new Error('Label not found'))

      await expect(service.removeLabel(123, 'nonexistent')).resolves.toBeUndefined()
    })
  })

  describe('getComments', () => {
    it('should return comments from the API', async () => {
      const mockComments = [{ body: 'test comment' }]
      mockRequest.mockResolvedValueOnce({ data: mockComments })

      const result = await service.getComments(123)

      expect(result).toEqual(mockComments)
      expect(mockRequest).toHaveBeenCalledWith(
        'GET /repos/{owner}/{repo}/issues/{issue_number}/comments',
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          issue_number: 123,
        }),
      )
    })
  })

  describe('searchIssues', () => {
    it('should prepend repo context to query', async () => {
      mockRequest.mockResolvedValueOnce({ data: { total_count: 0, items: [] } })

      await service.searchIssues('is:issue is:open')

      expect(mockRequest).toHaveBeenCalledWith(
        'GET /search/issues',
        expect.objectContaining({
          q: 'repo:test-owner/test-repo is:issue is:open',
        }),
      )
    })
  })

  describe('getAssignmentCount', () => {
    it('should return the count of assigned issues', async () => {
      mockRequest.mockResolvedValueOnce({
        data: { total_count: 3, items: [{}, {}, {}] },
      })

      const count = await service.getAssignmentCount('testuser')

      expect(count).toBe(3)
    })
  })

  describe('assignWithLabel', () => {
    it('should add assignee and label in parallel', async () => {
      await service.assignWithLabel(123, 'testuser', '📍 Assigned')

      expect(mockRequest).toHaveBeenCalledTimes(2)
    })
  })

  describe('unassignWithLabels', () => {
    it('should remove assignee and multiple labels', async () => {
      await service.unassignWithLabels(123, 'testuser', ['label1', 'label2'])

      // 1 removeAssignee + 2 removeLabel calls
      expect(mockRequest).toHaveBeenCalledTimes(3)
    })
  })
})
