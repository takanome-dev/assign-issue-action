import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { CommentService } from '../comment-service'
import type { RepoContext } from '../issue-service'

const mockRequest = mock(() => Promise.resolve({ data: {} }))

const mockOctokit = {
  request: mockRequest,
} as any

const repoContext: RepoContext = {
  owner: 'test-owner',
  repo: 'test-repo',
}

describe('CommentService', () => {
  let service: CommentService

  beforeEach(() => {
    mockRequest.mockClear()
    mockRequest.mockResolvedValue({ data: {} })
    service = new CommentService(mockOctokit, repoContext)
  })

  describe('createComment', () => {
    it('should call the correct API endpoint', async () => {
      await service.createComment(123, 'Hello world')

      expect(mockRequest).toHaveBeenCalledWith(
        'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          issue_number: 123,
          body: 'Hello world',
        }),
      )
    })
  })

  describe('createTemplatedComment', () => {
    it('should render template and post comment', async () => {
      await service.createTemplatedComment(
        123,
        'Hello {{name}}! You have {{count}} issues.',
        { name: 'John', count: 5 },
      )

      expect(mockRequest).toHaveBeenCalledWith(
        'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
        expect.objectContaining({
          body: 'Hello John! You have 5 issues.',
        }),
      )
    })

    it('should handle nested template variables', async () => {
      await service.createTemplatedComment(
        123,
        'Assigned to @{{handle}} for {{total_days}} days',
        { handle: 'testuser', total_days: 14 },
      )

      expect(mockRequest).toHaveBeenCalledWith(
        'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
        expect.objectContaining({
          body: 'Assigned to @testuser for 14 days',
        }),
      )
    })
  })

  describe('renderTemplate', () => {
    it('should render template without posting', () => {
      const result = service.renderTemplate(
        'Hello {{name}}!',
        { name: 'World' },
      )

      expect(result).toBe('Hello World!')
      expect(mockRequest).not.toHaveBeenCalled()
    })

    it('should handle empty data', () => {
      const result = service.renderTemplate('Static text', {})

      expect(result).toBe('Static text')
    })
  })
})
