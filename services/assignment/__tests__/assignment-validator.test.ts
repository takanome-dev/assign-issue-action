import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { ActionConfig } from '../../../core'
import { AssignmentValidator, type IssueContext } from '../assignment-validator'

const mockIssueService = {
  getComments: mock(() => Promise.resolve([])),
  getAssignmentCount: mock(() => Promise.resolve(0)),
  getAssignmentCountPerLabel: mock(() => Promise.resolve(new Map())),
} as any

const defaultConfig: ActionConfig = {
  githubToken: 'test-token',
  selfAssignCmd: '/assign-me',
  selfUnassignCmd: '/unassign-me',
  assignUserCmd: '/assign',
  unassignUserCmd: '/unassign',
  assignedLabel: '📍 Assigned',
  requiredLabel: '',
  pinLabel: '📌 Pinned',
  staleAssignmentLabel: '',
  daysUntilUnassign: 14,
  maintainers: [],
  enableAutoSuggestion: false,
  allowSelfAssignAuthor: true,
  blockAssignment: false,
  maxAssignments: 3,
  maxOverallAssignmentLabels: [],
  maxOverallAssignmentCount: 0,
  enableReminder: false,
  reminderDays: 'auto',
  assignedComment: '',
  assignedCommentNewcomer: '',
  unassignedComment: 'Unassigned @{{handle}}',
  alreadyAssignedComment: '',
  alreadyAssignedCommentPinned: '',
  assignmentSuggestionComment: '',
  blockAssignmentComment: '',
  reminderComment: '',
  maxAssignmentsMessage: '',
  maxOverallAssignmentMessage: '',
  selfAssignAuthorBlockedComment: '',
}

const mockIssue: IssueContext = {
  number: 123,
  assignee: null,
  assignees: [],
  user: { login: 'issue-author' },
  labels: [{ name: 'bug' }],
}

describe('AssignmentValidator', () => {
  let validator: AssignmentValidator
  let config: ActionConfig

  beforeEach(() => {
    config = { ...defaultConfig }
    mockIssueService.getComments.mockClear()
    mockIssueService.getAssignmentCount.mockClear()
    mockIssueService.getAssignmentCountPerLabel.mockClear()
    mockIssueService.getComments.mockResolvedValue([])
    mockIssueService.getAssignmentCount.mockResolvedValue(0)
    mockIssueService.getAssignmentCountPerLabel.mockResolvedValue(new Map())
    validator = new AssignmentValidator(mockIssueService, config)
  })

  describe('isAlreadyAssigned', () => {
    it('should return false when no assignee', () => {
      expect(validator.isAlreadyAssigned(mockIssue)).toBe(false)
    })

    it('should return true when assignee exists', () => {
      const assigned = { ...mockIssue, assignee: { login: 'user1' } }
      expect(validator.isAlreadyAssigned(assigned)).toBe(true)
    })

    it('should return true when assignees array is not empty', () => {
      const assigned = { ...mockIssue, assignees: [{ login: 'user1' }] }
      expect(validator.isAlreadyAssigned(assigned)).toBe(true)
    })
  })

  describe('isIssuePinned', () => {
    it('should return false when no pin label', () => {
      expect(validator.isIssuePinned(mockIssue)).toBe(false)
    })

    it('should return true when pin label exists', () => {
      const pinned = { ...mockIssue, labels: [{ name: '📌 Pinned' }] }
      expect(validator.isIssuePinned(pinned)).toBe(true)
    })
  })

  describe('hasRequiredLabel', () => {
    it('should return valid when no required label configured', () => {
      const result = validator.hasRequiredLabel(mockIssue)
      expect(result.valid).toBe(true)
    })

    it('should return invalid when required label missing', () => {
      config.requiredLabel = 'help-wanted'
      validator = new AssignmentValidator(mockIssueService, config)

      const result = validator.hasRequiredLabel(mockIssue)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('help-wanted')
    })

    it('should return valid when required label exists', () => {
      config.requiredLabel = 'bug'
      validator = new AssignmentValidator(mockIssueService, config)

      const result = validator.hasRequiredLabel(mockIssue)
      expect(result.valid).toBe(true)
    })
  })

  describe('canSelfAssignOwnIssue', () => {
    it('should return valid when author assignment is allowed', () => {
      const result = validator.canSelfAssignOwnIssue(mockIssue, 'issue-author')
      expect(result.valid).toBe(true)
    })

    it('should return invalid when author tries to self-assign and blocked', () => {
      config.allowSelfAssignAuthor = false
      validator = new AssignmentValidator(mockIssueService, config)

      const result = validator.canSelfAssignOwnIssue(mockIssue, 'issue-author')
      expect(result.valid).toBe(false)
    })

    it('should return valid when non-author tries to assign', () => {
      config.allowSelfAssignAuthor = false
      validator = new AssignmentValidator(mockIssueService, config)

      const result = validator.canSelfAssignOwnIssue(mockIssue, 'other-user')
      expect(result.valid).toBe(true)
    })
  })

  describe('wasBlockedFromReassignment', () => {
    it('should return valid when blocking is disabled', async () => {
      const result = await validator.wasBlockedFromReassignment(123, 'user1')
      expect(result.valid).toBe(true)
    })

    it('should return invalid when user was previously unassigned', async () => {
      config.blockAssignment = true
      validator = new AssignmentValidator(mockIssueService, config)

      mockIssueService.getComments.mockResolvedValueOnce([
        { body: 'Unassigned @user1' },
      ])

      const result = await validator.wasBlockedFromReassignment(123, 'user1')
      expect(result.valid).toBe(false)
    })
  })

  describe('hasReachedMaxAssignments', () => {
    it('should return valid when under limit', async () => {
      mockIssueService.getAssignmentCount.mockResolvedValueOnce(2)

      const result = await validator.hasReachedMaxAssignments('user1')
      expect(result.valid).toBe(true)
    })

    it('should return invalid when at limit', async () => {
      mockIssueService.getAssignmentCount.mockResolvedValueOnce(3)

      const result = await validator.hasReachedMaxAssignments('user1')
      expect(result.valid).toBe(false)
    })
  })

  describe('hasReachedLabelLimit', () => {
    it('should return valid when no label limits configured', async () => {
      const result = await validator.hasReachedLabelLimit('user1', [
        { name: 'bug' },
      ])
      expect(result.valid).toBe(true)
    })

    it('should return invalid when label limit reached', async () => {
      config.maxOverallAssignmentLabels = ['good-first-issue']
      config.maxOverallAssignmentCount = 2
      validator = new AssignmentValidator(mockIssueService, config)

      mockIssueService.getAssignmentCountPerLabel.mockResolvedValueOnce(
        new Map([['good-first-issue', 2]]),
      )

      const result = await validator.hasReachedLabelLimit('user1', [
        { name: 'good-first-issue' },
      ])
      expect(result.valid).toBe(false)
    })
  })

  describe('validateAssignment', () => {
    it('should return valid for all passing checks', async () => {
      const result = await validator.validateAssignment(mockIssue, 'user1')
      expect(result.valid).toBe(true)
    })

    it('should fail fast on already assigned', async () => {
      const assigned = { ...mockIssue, assignee: { login: 'existing' } }
      const result = await validator.validateAssignment(assigned, 'user1')
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('already assigned')
    })
  })
})
