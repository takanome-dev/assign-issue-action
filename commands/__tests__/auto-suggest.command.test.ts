import { describe, expect, it, mock } from 'bun:test'
import { AutoSuggestCommand } from '../auto-suggest.command'
import type { CommandContext, CommandServices } from '../types'

const mockCreateComment = mock(
  (_issueNumber: number, _template: string, _data: Record<string, unknown>) =>
    Promise.resolve(),
)
const mockGetLatestAssignmentDate = mock((_issueNumber: number) =>
  Promise.resolve(new Date()),
)

mock.module('@actions/core', () => ({
  info: mock(() => {}),
  setOutput: mock(() => {}),
}))

describe('AutoSuggestCommand', () => {
  it('should pass days_remaining when issue is already assigned', async () => {
    const command = new AutoSuggestCommand()
    const daysUntilUnassign = 14

    mockGetLatestAssignmentDate.mockResolvedValueOnce(new Date())

    const context = {
      issue: {
        number: 123,
        state: 'open',
        assignee: { login: 'user2' },
        assignees: [{ login: 'user2' }],
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
        daysUntilUnassign,
        maintainers: [],
        enableAutoSuggestion: true,
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
        getLatestAssignmentDate: mockGetLatestAssignmentDate,
      },
      commentService: {
        createTemplatedComment: mockCreateComment,
        renderTemplate: (template: string, data: Record<string, unknown>) =>
          template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
            String(data[key] || ''),
          ),
      },
      validator: {
        isAlreadyAssigned: () => true,
        isIssuePinned: () => false,
      },
    }

    await command.execute(
      context as unknown as CommandContext,
      services as unknown as CommandServices,
    )

    expect(mockCreateComment).toHaveBeenCalledWith(
      123,
      expect.any(String),
      expect.objectContaining({
        days_remaining: expect.any(Number),
      }),
    )
  })
})
