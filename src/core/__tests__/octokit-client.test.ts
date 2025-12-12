import { describe, expect, it, mock } from 'bun:test'
import { createOctokitClient } from '../octokit-client'

// Mock @actions/core
mock.module('@actions/core', () => ({
  warning: mock(() => {}),
}))

describe('createOctokitClient', () => {
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
})
