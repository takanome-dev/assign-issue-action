import * as core from '@actions/core'
import { add, format } from 'date-fns'
import type {
  Command,
  CommandContext,
  CommandResult,
  CommandServices,
  ParsedCommand,
} from './types'

export class AssignUserCommand implements Command {
  constructor(private readonly parsedCommand: ParsedCommand) {}

  async execute(
    context: CommandContext,
    services: CommandServices,
  ): Promise<CommandResult> {
    const { issue, config } = context
    const { issueService, commentService, newcomerChecker } = services

    const targetUsername = this.parsedCommand.targetUsername

    core.info(`Starting issue assignment to user`)

    if (!targetUsername) {
      core.info(`No valid user handle found after /assign command`)
      core.setOutput('assigned', 'no')
      return { success: false, message: 'No target username provided' }
    }

    core.info(`🤖 Assigning @${targetUsername} to issue #${issue?.number}`)

    // Check if newcomer
    const isNewcomer = await newcomerChecker.isNewcomer(targetUsername)
    const commentTemplate = isNewcomer
      ? config.assignedCommentNewcomer
      : config.assignedComment

    core.info(
      `🤖 User @${targetUsername} is ${isNewcomer ? 'a newcomer' : 'a returning contributor'}`,
    )

    await Promise.all([
      issueService.assignWithLabel(
        Number(issue?.number),
        targetUsername.trim(),
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
          handle: targetUsername,
          pin_label: config.pinLabel,
        },
      ),
    ])

    core.info(`🤖 Issue #${issue?.number} assigned!`)
    core.setOutput('assigned', 'yes')

    return {
      success: true,
      message: `Assigned @${targetUsername} to issue #${issue?.number}`,
    }
  }
}
