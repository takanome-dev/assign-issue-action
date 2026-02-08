import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { getConfig, loadConfig, resetConfig } from '../config'

// Mock @actions/core
const mockGetInput = mock((name: string) => {
  const inputs: Record<string, string> = {
    github_token: 'test-token',
    self_assign_cmd: '/assign-me',
    self_unassign_cmd: '/unassign-me',
    assign_user_cmd: '/assign',
    unassign_user_cmd: '/unassign',
    assigned_label: '📍 Assigned',
    required_label: '',
    pin_label: '📌 Pinned',
    stale_assignment_label: '',
    days_until_unassign: '14',
    maintainers: 'user1,user2',
    enable_auto_suggestion: 'false',
    allow_self_assign_author: 'true',
    block_assignment: 'false',
    max_assignments: '3',
    max_overall_assignment_labels: 'good-first-issue,help-wanted',
    max_overall_assignment_count: '2',
    enable_reminder: 'true',
    reminder_days: '7',
    assigned_comment: 'Assigned to {{handle}}',
    assigned_comment_newcomer: 'Welcome {{handle}}!',
    unassigned_comment: 'Unassigned {{handle}}',
    already_assigned_comment: 'Already assigned',
    already_assigned_comment_pinned: 'Pinned and assigned',
    assignment_suggestion_comment: 'Use /assign-me',
    block_assignment_comment: 'Blocked',
    reminder_comment: 'Reminder!',
    max_assignments_message: 'Max reached',
    max_overall_assignment_message: 'Label limit reached',
    self_assign_author_blocked_comment: 'Authors cannot self-assign',
  }
  return inputs[name] ?? ''
})

const mockGetBooleanInput = mock((name: string) => {
  const inputs: Record<string, boolean> = {
    enable_auto_suggestion: false,
  }
  return inputs[name] ?? false
})

mock.module('@actions/core', () => ({
  getInput: mockGetInput,
  getBooleanInput: mockGetBooleanInput,
}))

describe('config', () => {
  beforeEach(() => {
    resetConfig()
    mockGetInput.mockClear()
    mockGetBooleanInput.mockClear()
  })

  describe('loadConfig', () => {
    it('should load basic config values', () => {
      const config = loadConfig()

      expect(config.githubToken).toBe('test-token')
      expect(config.selfAssignCmd).toBe('/assign-me')
      expect(config.selfUnassignCmd).toBe('/unassign-me')
      expect(config.assignUserCmd).toBe('/assign')
      expect(config.unassignUserCmd).toBe('/unassign')
    })

    it('should load label config', () => {
      const config = loadConfig()

      expect(config.assignedLabel).toBe('📍 Assigned')
      expect(config.pinLabel).toBe('📌 Pinned')
    })

    it('should parse numeric values', () => {
      const config = loadConfig()

      expect(config.daysUntilUnassign).toBe(14)
      expect(config.maxAssignments).toBe(3)
      expect(config.maxOverallAssignmentCount).toBe(2)
    })

    it('should parse array values', () => {
      const config = loadConfig()

      expect(config.maintainers).toEqual(['user1', 'user2'])
      expect(config.maxOverallAssignmentLabels).toEqual([
        'good-first-issue',
        'help-wanted',
      ])
    })

    it('should parse boolean values', () => {
      const config = loadConfig()

      expect(config.enableReminder).toBe(true)
      expect(config.blockAssignment).toBe(false)
      expect(config.allowSelfAssignAuthor).toBe(true)
    })

    it('should parse reminder days as number', () => {
      const config = loadConfig()

      expect(config.reminderDays).toBe(7)
    })

    it('should load comment templates', () => {
      const config = loadConfig()

      expect(config.assignedComment).toBe('Assigned to {{handle}}')
      expect(config.assignedCommentNewcomer).toBe('Welcome {{handle}}!')
    })
  })

  describe('loadConfig with missing token', () => {
    it('should throw error when github_token is missing', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'github_token') return ''
        return 'some-value'
      })

      expect(() => loadConfig()).toThrow('Missing required input: github_token')
    })
  })

  describe('reminderDays edge cases', () => {
    it('should default to "auto" when reminder_days is not set', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'reminder_days') return ''
        if (name === 'github_token') return 'test-token'
        return 'some-value'
      })

      const config = loadConfig()
      expect(config.reminderDays).toBe('auto')
    })

    it('should handle "auto" string value for reminder_days', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'reminder_days') return 'auto'
        if (name === 'github_token') return 'test-token'
        return 'some-value'
      })

      const config = loadConfig()
      expect(config.reminderDays).toBe('auto')
    })

    it('should handle invalid numeric string for reminder_days', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'reminder_days') return 'not-a-number'
        if (name === 'github_token') return 'test-token'
        return 'some-value'
      })

      const config = loadConfig()
      expect(config.reminderDays).toBe('auto')
    })
  })

  describe('getConfig caching', () => {
    it('should return cached config on subsequent calls', () => {
      resetConfig() // Start fresh
      mockGetInput.mockClear()

      const config1 = getConfig()
      const config2 = getConfig()

      expect(config1).toBe(config2) // Same reference due to caching
      // After resetConfig, the first getConfig() calls loadConfig which calls getInput many times
      // But subsequent getConfig() calls should not trigger getInput again
      const callCountAfterFirstGet = mockGetInput.mock.calls.length

      // Trigger another getConfig() - should not increase call count
      getConfig()
      expect(mockGetInput.mock.calls.length).toBe(callCountAfterFirstGet)
    })

    it('should return new config after resetConfig', () => {
      resetConfig()
      const config1 = getConfig()
      resetConfig()
      const config2 = getConfig()

      expect(config1).not.toBe(config2)
    })
  })
})
