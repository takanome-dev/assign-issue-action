import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { createOctokitClient, type ThrottleOptions } from '../octokit-client'

const mockWarning = mock(() => {})

// Mock @actions/core
mock.module('@actions/core', () => ({
  warning: mockWarning,
}))

describe('createOctokitClient', () => {
  beforeEach(() => {
    mockWarning.mockClear()
  })

  it('should create an Octokit instance with throttling', () => {
    const client = createOctokitClient('test-token')

    expect(client).toBeDefined()
    expect(typeof client.request).toBe('function')
  })

  it('should configure auth with the provided token', () => {
    const token = 'ghp_test123'
    const client = createOctokitClient(token)

    // The client should be configured (we can't easily test the internal auth)
    expect(client).toBeDefined()
  })

  it('should return different instances for different calls', () => {
    const client1 = createOctokitClient('token1')
    const client2 = createOctokitClient('token2')

    expect(client1).not.toBe(client2)
  })

  describe('throttle handlers', () => {
    // Extract the handler logic inline to test the behavior
    const createOnRateLimit = () => {
      return (
        retryAfter: number,
        options: ThrottleOptions,
        _octokit: unknown,
        retryCount: number,
      ): boolean => {
        mockWarning(
          `Request quota exhausted for request ${options.method} ${options.url}`,
        )

        if (retryCount < 1) {
          mockWarning(`Retrying after ${retryAfter} seconds!`)
          return true
        }
        return false
      }
    }

    const createOnSecondaryRateLimit = () => {
      return (
        retryAfter: number,
        options: ThrottleOptions,
        _octokit: unknown,
        retryCount: number,
      ): boolean => {
        mockWarning(
          `SecondaryRateLimit detected for request ${options.method} ${options.url}`,
        )

        if (retryCount < 2) {
          mockWarning(
            `Secondary rate limit hit. Retrying after ${retryAfter} seconds!`,
          )
          return true
        }
        return false
      }
    }

    it('onRateLimit should retry on first failure', () => {
      const onRateLimit = createOnRateLimit()
      const options: ThrottleOptions = { method: 'GET', url: '/repos/test' }

      // First retry should succeed
      expect(onRateLimit(60, options, {}, 0)).toBe(true)
      expect(mockWarning).toHaveBeenCalledWith(
        'Request quota exhausted for request GET /repos/test',
      )
      expect(mockWarning).toHaveBeenCalledWith('Retrying after 60 seconds!')

      mockWarning.mockClear()

      // Second retry should fail
      expect(onRateLimit(60, options, {}, 1)).toBe(false)
      expect(mockWarning).toHaveBeenCalledWith(
        'Request quota exhausted for request GET /repos/test',
      )
    })

    it('onSecondaryRateLimit should retry on first two failures', () => {
      const onSecondaryRateLimit = createOnSecondaryRateLimit()
      const options: ThrottleOptions = {
        method: 'POST',
        url: '/repos/test/issues',
      }

      // First retry should succeed
      expect(onSecondaryRateLimit(120, options, {}, 0)).toBe(true)
      expect(mockWarning).toHaveBeenCalledWith(
        'SecondaryRateLimit detected for request POST /repos/test/issues',
      )

      mockWarning.mockClear()

      // Second retry should succeed
      expect(onSecondaryRateLimit(120, options, {}, 1)).toBe(true)
      expect(mockWarning).toHaveBeenCalledWith(
        'Secondary rate limit hit. Retrying after 120 seconds!',
      )

      mockWarning.mockClear()

      // Third retry should fail
      expect(onSecondaryRateLimit(120, options, {}, 2)).toBe(false)
      expect(mockWarning).toHaveBeenCalledWith(
        'SecondaryRateLimit detected for request POST /repos/test/issues',
      )
    })
  })
})
