import * as core from '@actions/core'
import type {
  Command,
  CommandContext,
  CommandResult,
  CommandServices,
} from './types'

export class SelfUnassignCommand implements Command {
  async execute(
    context: CommandContext,
    services: CommandServices,
  ): Promise<CommandResult> {
    const { issue, comment, config } = context
    const { issueService, commentService, validator } = services

    const commenterLogin = comment?.user?.login
    const assigneeLogin = issue?.assignee?.login

    core.info(
      `🤖 Starting issue #${issue?.number} unassignment for user @${assigneeLogin} in repo "${context.repoOwner}/${context.repoName}"`,
    )

    // Check if issue is assigned to anyone
    if (!assigneeLogin) {
      core.setOutput('unassigned', 'no')
      core.setOutput('unassigned_issues', [])
      core.info(`🤖 Issue is not assigned to anyone, ignoring...`)
      return {
        success: false,
        message: 'Issue is not assigned to anyone',
        output: { unassigned: 'no', unassigned_issues: [] },
      }
    }

    // Check if commenter is the assignee
    if (assigneeLogin !== commenterLogin) {
      // Issue is assigned to someone else - show "already assigned" message (issue #326)
      core.info(
        `🤖 Commenter @${commenterLogin} is different from the assignee @${assigneeLogin}, showing "already assigned" message`,
      )

      const isPinned = validator.isIssuePinned({
        labels: issue?.labels,
        number: Number(issue?.number),
      })
      const template = isPinned
        ? config.alreadyAssignedCommentPinned
        : config.alreadyAssignedComment

      await commentService.createTemplatedComment(Number(issue?.number), template, {
        handle: commenterLogin,
        assignee: assigneeLogin,
      })

      core.setOutput('unassigned', 'no')
      core.setOutput('unassigned_issues', [])

      return {
        success: false,
        message: `Commenter @${commenterLogin} is not the assignee @${assigneeLogin}`,
        output: { unassigned: 'no', unassigned_issues: [] },
      }
    }

    // Generate unassign comment with hidden marker for tracking
    const unassignBody = validator.getUnassignCommentBody(
      config.selfUnassignedComment,
      {
        handle: commenterLogin,
        pin_label: config.pinLabel,
      },
    )

    // Unassign and post comment
    await Promise.all([
      issueService.unassignWithLabels(Number(issue?.number), assigneeLogin, [
        config.assignedLabel,
        config.pinLabel,
        '🔔 reminder-sent',
      ]),
      commentService.createComment(Number(issue?.number), unassignBody),
    ])

    core.info(`🤖 Done issue unassignment!`)
    core.setOutput('unassigned', 'yes')
    core.setOutput('unassigned_issues', [issue?.number])

    return {
      success: true,
      message: `Unassigned @${commenterLogin} from issue #${issue?.number}`,
      output: { unassigned: 'yes', unassigned_issues: [issue?.number] },
    }
  }
}
