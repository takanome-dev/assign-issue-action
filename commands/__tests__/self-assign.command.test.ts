import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { SelfAssignCommand } from '../self-assign.command'

const mockCreateComment = mock(() => Promise.resolve())
const mockAssignWithLabel = mock(() => Promise.resolve())
const mockGetComments = mock(() => Promise.resolve([]))
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
          assignedComment: 'Assigned!',
          assignedCommentNewcomer: 'Welcome!',
          unassignedComment: 'Unassigned @{{handle}}',
          alreadyAssignedComment: 'Already assigned',
          alreadyAssignedCommentPinned: 'Already assigned (pinned)',
          assignmentSuggestionComment: 'Use /assign-me',
          blockAssignmentComment: 'Blocked',
          reminderComment: 'Reminder!',
          maxAssignmentsMessage: 'Max reached',
          maxOverallAssignmentMessage: 'Label limit',
          selfAssignAuthorBlockedComment: 'Blocked',
          ignoredUsers: [],
          ignoredMessage: '',
          closedIssueAssignmentComment: '',
        },
        repoOwner: 'test-owner',
        repoName: 'test-repo',
      }

      const services = {
        issueService: {
          assignWithLabel: mockAssignWithLabel,
          getComments: mockGetComments,
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
          assignedComment: 'Assigned!',
          assignedCommentNewcomer: 'Welcome!',
          unassignedComment: 'Unassigned @{{handle}}',
          alreadyAssignedComment: 'Already assigned to @{{assignee}}',
          alreadyAssignedCommentPinned: 'Already assigned (pinned)',
          assignmentSuggestionComment: 'Use /assign-me',
          blockAssignmentComment: 'Blocked',
          reminderComment: 'Reminder!',
          maxAssignmentsMessage: 'Max reached',
          maxOverallAssignmentMessage: 'Label limit',
          selfAssignAuthorBlockedComment: 'Blocked',
          ignoredUsers: [],
          ignoredMessage: '',
          closedIssueAssignmentComment: '',
        },
        repoOwner: 'test-owner',
        repoName: 'test-repo',
      }

      const services = {
        issueService: {
          assignWithLabel: mockAssignWithLabel,
          getComments: mockGetComments,
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
  })
})
