import * as core from '@actions/core'
import type {
  Command,
  CommandContext,
  CommandResult,
  CommandServices,
} from './types'

export class AutoSuggestCommand implements Command {
  async execute(
    context: CommandContext,
    services: CommandServices,
  ): Promise<CommandResult> {
    const { issue, comment, config } = context
    const { commentService, validator } = services
    const username = comment?.user?.login

    core.info(`🤖 Comment indicates interest in contribution`)

    // Check if already assigned
    const isAssigned = validator.isAlreadyAssigned({
      number: Number(issue?.number),
      assignee: issue?.assignee,
      assignees: issue?.assignees,
    })

    if (isAssigned) {
      const isPinned = validator.isIssuePinned({
        labels: issue?.labels,
        number: Number(issue?.number),
      })

      const template = isPinned
        ? config.alreadyAssignedCommentPinned
        : config.alreadyAssignedComment

      await commentService.createTemplatedComment(
        Number(issue?.number),
        template,
        {
          total_days: String(config.daysUntilUnassign),
          handle: username,
          assignee: issue?.assignee?.login,
        },
      )

      core.setOutput('assigned', 'no')
      core.info(
        `🤖 Issue #${issue?.number} is already assigned to @${issue?.assignee?.login}`,
      )

      return {
        success: false,
        message: `Issue is already assigned to @${issue?.assignee?.login}`,
      }
    }

    // Suggest using the assign command
    await commentService.createTemplatedComment(
      Number(issue?.number),
      config.assignmentSuggestionComment,
      {
        handle: username,
        trigger: config.selfAssignCmd,
      },
    )

    return {
      success: true,
      message: `Suggested @${username} to use ${config.selfAssignCmd}`,
    }
  }
}
