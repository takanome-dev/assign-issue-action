import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { differenceInDays } from 'date-fns'
import { SelfAssignCommand } from '../self-assign.command'

const mockCreateComment = mock(() => Promise.resolve())
const mockAssignWithLabel = mock(() => Promise.resolve())
const mockGetComments = mock(() => Promise.resolve([]))
const mockGetLatestAssignmentDate = mock(() => Promise.resolve(new Date()))
const mockGetAssignmentCount = mock(() => Promise.resolve(0))
const mockGetAssignmentCountPerLabel = mock(() => Promise.resolve(new Map()))
const mockSearchIssues = mock(() =>
  Promise.resolve({ total_count: 0, items: [] }),
)
const mockIsNewcomer = mock(() => Promise.resolve(false))
const mockInfo = mock(() => {})
const mockSetOutput = mock(() => {})

mock.module('@actions/core', () => ({
  info: mockInfo,
  setOutput: mockSetOutput,
}))

describe('SelfAssignCommand', () => {
  let command: SelfAssignCommand

  beforeEach(() => {
    command = new SelfAssignCommand()
    mockCreateComment.mockClear()
    mockAssignWithLabel.mockClear()
    mockGetComments.mockClear()
    mockGetLatestAssignmentDate.mockClear()
    mockInfo.mockClear()
    mockSetOutput.mockClear()
  })

  describe('already assigned handling', () => {
    it('should stay silent when user is already assigned to themselves (issue #405)', async () => {
      const context = {
        issue: {
          number: 123,
          state: 'open',
          assignee: { login: 'user1' },
          assignees: [{ login: 'user1' }],
          user: { login: 'issue-author' },
          labels: [],
          updated_at: new Date().toISOString(),
        },
        comment: { user: { login: 'user1' } },
        config: {
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
          assignedText: 'Assigned!',
          assignedNewcomerText: 'Welcome!',
          unassignedText: 'Unassigned @{{handle}}',
          selfUnassignedText: '',
          alreadyAssignedText: 'Already assigned',
          alreadyAssignedPinnedText: 'Already assigned (pinned)',
          assignmentSuggestionText: 'Use /assign-me',
          blockAssignmentText: 'Blocked',
          reminderText: 'Reminder!',
          maxAssignmentsText: 'Max reached',
          maxOverallAssignmentText: 'Label limit',
          selfAssignAuthorBlockedText: 'Blocked',
          ignoredUsers: [],
          ignoredText: '',
          closedIssueAssignmentText: '',
        },
        repoOwner: 'test-owner',
        repoName: 'test-repo',
      }

      const services = {
        issueService: {
          assignWithLabel: mockAssignWithLabel,
          getComments: mockGetComments,
          getLatestAssignmentDate: mockGetLatestAssignmentDate,
          getAssignmentCount: mockGetAssignmentCount,
          getAssignmentCountPerLabel: mockGetAssignmentCountPerLabel,
          searchIssues: mockSearchIssues,
        },
        commentService: {
          createTemplatedComment: mockCreateComment,
          renderTemplate: (template: string, data: Record<string, unknown>) =>
            template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
              String(data[key] || ''),
            ),
        },
        teamService: {} as any,
        validator: {
          validateAssignment: () =>
            Promise.resolve({
              valid: false,
              reason: 'Issue #123 is already assigned to @user1',
            }),
          isIssuePinned: () => false,
        } as any,
        newcomerChecker: {
          isNewcomer: mockIsNewcomer,
        },
      }

      const result = await command.execute(context as any, services as any)

      // Should succeed (user is already assigned)
      expect(result.success).toBe(true)
      // Should NOT post any comment
      expect(mockCreateComment).not.toHaveBeenCalled()
      // Should log info message
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining('already assigned'),
      )
    })

    it('should post "already assigned" comment when DIFFERENT user tries to assign', async () => {
      const context = {
        issue: {
          number: 123,
          state: 'open',
          assignee: { login: 'user2' },
          assignees: [{ login: 'user2' }],
          user: { login: 'issue-author' },
          labels: [],
          updated_at: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 7 days ago
        },
        comment: { user: { login: 'user1' } },
        config: {
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
          assignedText: 'Assigned!',
          assignedNewcomerText: 'Welcome!',
          unassignedText: 'Unassigned @{{handle}}',
          selfUnassignedText: '',
          alreadyAssignedText: 'Already assigned to @{{assignee}}',
          alreadyAssignedPinnedText: 'Already assigned (pinned)',
          assignmentSuggestionText: 'Use /assign-me',
          blockAssignmentText: 'Blocked',
          reminderText: 'Reminder!',
          maxAssignmentsText: 'Max reached',
          maxOverallAssignmentText: 'Label limit',
          selfAssignAuthorBlockedText: 'Blocked',
          ignoredUsers: [],
          ignoredText: '',
          closedIssueAssignmentText: '',
        },
        repoOwner: 'test-owner',
        repoName: 'test-repo',
      }

      const services = {
        issueService: {
          assignWithLabel: mockAssignWithLabel,
          getComments: mockGetComments,
          getLatestAssignmentDate: mockGetLatestAssignmentDate,
          getAssignmentCount: mockGetAssignmentCount,
          getAssignmentCountPerLabel: mockGetAssignmentCountPerLabel,
          searchIssues: mockSearchIssues,
        },
        commentService: {
          createTemplatedComment: mockCreateComment,
          renderTemplate: (template: string, data: Record<string, unknown>) =>
            template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
              String(data[key] || ''),
            ),
        },
        teamService: {} as any,
        validator: {
          validateAssignment: () =>
            Promise.resolve({
              valid: false,
              reason: 'Issue #123 is already assigned to @user2',
            }),
          isIssuePinned: () => false,
        } as any,
        newcomerChecker: {
          isNewcomer: mockIsNewcomer,
        },
      }

      const result = await command.execute(context as any, services as any)

      // Should fail (different user can't assign)
      expect(result.success).toBe(false)
      // SHOULD post "already assigned" comment
      expect(mockCreateComment).toHaveBeenCalled()
    })

    it('should use assignment event date instead of issue.updated_at for days_remaining (issue #<bug>)', async () => {
      const daysUntilUnassign = 14
      const assignmentEventDate = new Date(
        Date.now() - 7.5 * 24 * 60 * 60 * 1000,
      ) // 7.5 days ago -> 7 full days
      const expectedDaysRemaining =
        daysUntilUnassign - differenceInDays(new Date(), assignmentEventDate)

      mockGetLatestAssignmentDate.mockResolvedValueOnce(assignmentEventDate)

      const context = {
        issue: {
          number: 123,
          state: 'open',
          assignee: { login: 'user2' },
          assignees: [{ login: 'user2' }],
          user: { login: 'issue-author' },
          labels: [],
          updated_at: new Date().toISOString(), // recent (would give 14 days if used)
        },
        comment: { user: { login: 'user1' } },
        config: {
          githubToken: 'test-token',
          selfAssignCmd: '/assign-me',
          selfUnassignCmd: '/unassign-me',
          assignUserCmd: '/assign',
          unassignUserCmd: '/unassign',
          assignedLabel: '📍 Assigned',
          requiredLabel: '',
          pinLabel: '📌 Pinned',
          staleAssignmentLabel: '',
          daysUntilUnassign,
          maintainers: [],
          enableAutoSuggestion: false,
          allowSelfAssignAuthor: true,
          blockAssignment: false,
          maxAssignments: 3,
          maxOverallAssignmentLabels: [],
          maxOverallAssignmentCount: 0,
          enableReminder: false,
          reminderDays: 'auto',
          assignedText: 'Assigned!',
          assignedNewcomerText: 'Welcome!',
          unassignedText: 'Unassigned @{{handle}}',
          selfUnassignedText: '',
          alreadyAssignedText: 'Already assigned to @{{assignee}}',
          alreadyAssignedPinnedText: 'Already assigned (pinned)',
          assignmentSuggestionText: 'Use /assign-me',
          blockAssignmentText: 'Blocked',
          reminderText: 'Reminder!',
          maxAssignmentsText: 'Max reached',
          maxOverallAssignmentText: 'Label limit',
          selfAssignAuthorBlockedText: 'Blocked',
          ignoredUsers: [],
          ignoredText: '',
          closedIssueAssignmentText: '',
        },
        repoOwner: 'test-owner',
        repoName: 'test-repo',
      }

      const services = {
        issueService: {
          assignWithLabel: mockAssignWithLabel,
          getComments: mockGetComments,
          getLatestAssignmentDate: mockGetLatestAssignmentDate,
          getAssignmentCount: mockGetAssignmentCount,
          getAssignmentCountPerLabel: mockGetAssignmentCountPerLabel,
          searchIssues: mockSearchIssues,
        },
        commentService: {
          createTemplatedComment: mockCreateComment,
          renderTemplate: (template: string, data: Record<string, unknown>) =>
            template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
              String(data[key] || ''),
            ),
        },
        teamService: {} as any,
        validator: {
          validateAssignment: () =>
            Promise.resolve({
              valid: false,
              reason: 'Issue #123 is already assigned to @user2',
            }),
          isIssuePinned: () => false,
        } as any,
        newcomerChecker: {
          isNewcomer: mockIsNewcomer,
        },
      }

      await command.execute(context as any, services as any)

      // Should use the assignment event date, not updated_at, so days_remaining is based on 7 days
      expect(mockCreateComment).toHaveBeenCalledWith(
        123,
        expect.any(String),
        expect.objectContaining({
          days_remaining: expectedDaysRemaining,
        }),
      )
      // Sanity check: it must NOT be the fallback value of 14 days
      expect(expectedDaysRemaining).not.toBe(14)
    })
  })
})
