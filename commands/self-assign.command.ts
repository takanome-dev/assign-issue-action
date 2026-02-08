import * as core from '@actions/core'
import { add, format } from 'date-fns'
import type {
  Command,
  CommandContext,
  CommandResult,
  CommandServices,
} from './types'

export class SelfAssignCommand implements Command {
  async execute(
    context: CommandContext,
    services: CommandServices,
  ): Promise<CommandResult> {
    const { issue, comment, config } = context
    const { issueService, commentService, validator, newcomerChecker } =
      services
    const username = comment?.user?.login

    core.info(
      `🤖 Starting assignment for issue #${issue?.number} in repo "${context.repoOwner}/${context.repoName}"`,
    )

    // Validate assignment
    const validation = await validator.validateAssignment(
      {
        number: Number(issue?.number),
        state: issue?.state,
        assignee: issue?.assignee,
        assignees: issue?.assignees,
        user: issue?.user,
        labels: issue?.labels,
      },
      username,
    )

    if (!validation.valid) {
      // Determine which comment to post based on the reason
      if (validation.reason?.includes('is closed')) {
        await commentService.createTemplatedComment(
          Number(issue?.number),
          config.closedIssueAssignmentComment,
          { handle: username },
        )
      } else if (validation.reason?.includes('ignored users list')) {
        await commentService.createTemplatedComment(
          Number(issue?.number),
          config.ignoredMessage,
          { handle: username },
        )
      } else if (
        validation.reason?.includes('cannot self-assign their own issue')
      ) {
        await commentService.createTemplatedComment(
          Number(issue?.number),
          config.selfAssignAuthorBlockedComment,
          { handle: username },
        )
      } else if (validation.reason?.includes('already assigned')) {
        const isPinned = validator.isIssuePinned({
          labels: issue?.labels,
          number: Number(issue?.number),
        })
        const template = isPinned
          ? config.alreadyAssignedCommentPinned
          : config.alreadyAssignedComment

        // Check if we already posted an "already assigned" comment recently
        const hasRecentComment = await this._hasRecentAlreadyAssignedComment(
          issueService,
          Number(issue?.number),
          username,
          template,
        )

        if (!hasRecentComment) {
          await commentService.createTemplatedComment(
            Number(issue?.number),
            template,
            {
              total_days: String(config.daysUntilUnassign),
              handle: username,
              assignee: issue?.assignee?.login,
            },
          )
        } else {
          core.info(
            `🤖 Skipping "already assigned" comment - already posted recently for issue #${issue?.number}`,
          )
        }
      } else if (validation.reason?.includes('was previously unassigned')) {
        await commentService.createTemplatedComment(
          Number(issue?.number),
          config.blockAssignmentComment,
          { handle: username },
        )
      } else if (validation.reason?.includes('maximum number of assignments')) {
        await commentService.createTemplatedComment(
          Number(issue?.number),
          config.maxAssignmentsMessage,
          {
            handle: username,
            max_assignments: config.maxAssignments.toString(),
          },
        )
      } else if (validation.reason?.includes('assignment limit for label')) {
        // Extract label name from reason
        const labelMatch = validation.reason.match(/label "([^"]+)"/)
        const label = labelMatch?.[1] ?? ''
        await commentService.createTemplatedComment(
          Number(issue?.number),
          config.maxOverallAssignmentMessage,
          {
            handle: username,
            max_overall_assignment_count:
              config.maxOverallAssignmentCount.toString(),
            label,
          },
        )
      }

      core.setOutput('assigned', 'no')
      core.info(`🤖 ${validation.reason}`)
      return { success: false, message: validation.reason }
    }

    core.info(`🤖 Assigning @${username} to issue #${issue?.number}`)

    // Check if newcomer
    const isNewcomer = await newcomerChecker.isNewcomer(username)
    const commentTemplate = isNewcomer
      ? config.assignedCommentNewcomer
      : config.assignedComment

    core.info(
      `🤖 User @${username} is ${isNewcomer ? 'a newcomer' : 'a returning contributor'}`,
    )

    // Assign and post comment
    await Promise.all([
      issueService.assignWithLabel(
        Number(issue?.number),
        username,
        config.assignedLabel,
      ),
      commentService.createTemplatedComment(
        Number(issue?.number),
        commentTemplate,
        {
          total_days: config.daysUntilUnassign,
          unassigned_date: format(
            add(new Date(), { days: config.daysUntilUnassign }),
            'dd LLLL y',
          ),
          handle: username,
          pin_label: config.pinLabel,
        },
      ),
    ])

    core.info(`🤖 Issue #${issue?.number} assigned!`)
    core.setOutput('assigned', 'yes')

    return {
      success: true,
      message: `Assigned @${username} to issue #${issue?.number}`,
    }
  }

  /**
   * Check if we already posted an "already assigned" comment recently
   * to avoid repetitive comments when users keep trying to assign themselves
   */
  private async _hasRecentAlreadyAssignedComment(
    issueService: CommandServices['issueService'],
    issueNumber: number,
    username: string,
    template: string,
  ): Promise<boolean> {
    try {
      const comments = await issueService.getComments(issueNumber)

      // Look for a recent comment from the bot mentioning this user and "already assigned"
      const recentThreshold = new Date()
      recentThreshold.setDate(recentThreshold.getDate() - 1) // Within last 24 hours

      return comments.some((comment) => {
        const commentDate = comment.body?.includes('already assigned')
          ? new Date(comment.created_at || Date.now())
          : null
        if (!commentDate) return false

        // Check if comment is recent and mentions this user
        const isRecent = commentDate > recentThreshold
        const mentionsUser = comment.body?.includes(`@${username}`)
        const isAlreadyAssignedComment =
          comment.body?.includes('already assigned') ||
          template
            .split('\n')[0]
            .trim()
            .split(' ')
            .slice(0, 3)
            .every((word) => comment.body?.includes(word))

        return isRecent && mentionsUser && isAlreadyAssignedComment
      })
    } catch {
      // If we can't fetch comments, assume no recent comment to be safe
      return false
    }
  }
}
