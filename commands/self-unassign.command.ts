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
      `🤖 Starting issue #${issue?.number} unassignment for user @${commenterLogin} in repo "${context.repoOwner}/${context.repoName}"`,
    )

    // Check if commenter is the assignee
    // If not, stay silent (do not react with "already assigned" - issue #326)
    if (assigneeLogin !== commenterLogin) {
      core.setOutput('unassigned', 'no')
      core.setOutput('unassigned_issues', [])

      if (assigneeLogin) {
        core.info(
          `🤖 Commenter @${commenterLogin} is not the assignee @${assigneeLogin}, staying silent (issue #326)`,
        )
      } else {
        core.info(
          `🤖 Issue is not assigned to anyone, staying silent (issue #326)`,
        )
      }

      return {
        success: false,
        message: 'Commenter is not the assignee',
        output: { unassigned: 'no', unassigned_issues: [] },
      }
    }

    // Generate unassign comment with hidden marker for tracking
    const unassignBody = validator.getUnassignCommentBody(
      config.unassignedComment,
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
