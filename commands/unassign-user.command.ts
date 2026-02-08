import * as core from '@actions/core'
import type {
  Command,
  CommandContext,
  CommandResult,
  CommandServices,
  ParsedCommand,
} from './types'

export class UnassignUserCommand implements Command {
  constructor(private readonly parsedCommand: ParsedCommand) {}

  async execute(
    context: CommandContext,
    services: CommandServices,
  ): Promise<CommandResult> {
    const { issue, config } = context
    const { issueService } = services

    const targetUsername = this.parsedCommand.targetUsername

    core.info(`Starting issue unassignment to user`)

    if (!targetUsername) {
      core.setOutput('unassigned', 'no')
      core.setOutput('unassigned_issues', [])
      core.info(`No valid user handle found after /unassign command`)
      return {
        success: false,
        message: 'No target username provided',
        output: { unassigned: 'no', unassigned_issues: [] },
      }
    }

    // Check if target is the current assignee
    if (issue?.assignee?.login !== targetUsername) {
      core.setOutput('unassigned', 'no')
      core.setOutput('unassigned_issues', [])
      core.info(
        `🤖 User @${targetUsername} is not assigned to the issue #${issue?.number}`,
      )
      return {
        success: false,
        message: `User @${targetUsername} is not assigned to the issue`,
        output: { unassigned: 'no', unassigned_issues: [] },
      }
    }

    // Unassign user
    await issueService.unassignWithLabels(
      Number(issue?.number),
      targetUsername,
      [config.assignedLabel, config.pinLabel, '🔔 reminder-sent'],
    )

    core.setOutput('unassigned', 'yes')
    core.setOutput('unassigned_issues', [issue?.number])
    core.info(
      `🤖 User @${targetUsername} is unassigned from the issue #${issue?.number}`,
    )

    return {
      success: true,
      message: `Unassigned @${targetUsername} from issue #${issue?.number}`,
      output: { unassigned: 'yes', unassigned_issues: [issue?.number] },
    }
  }
}
