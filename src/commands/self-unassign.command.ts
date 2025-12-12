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
    const { issueService, commentService } = services

    const commenterLogin = comment?.user?.login
    const assigneeLogin = issue?.assignee?.login

    core.info(
      `🤖 Starting issue #${issue?.number} unassignment for user @${assigneeLogin} in repo "${context.repoOwner}/${context.repoName}"`,
    )

    // Check if commenter is the assignee
    if (assigneeLogin !== commenterLogin) {
      core.setOutput('unassigned', 'no')
      core.setOutput('unassigned_issues', [])
      core.info(`🤖 Commenter is different from the assignee, ignoring...`)
      return {
        success: false,
        message: 'Commenter is not the assignee',
        output: { unassigned: 'no', unassigned_issues: [] },
      }
    }

    // Unassign and post comment
    await Promise.all([
      issueService.unassignWithLabels(
        Number(issue?.number),
        assigneeLogin,
        [config.assignedLabel, config.pinLabel, '🔔 reminder-sent'],
      ),
      commentService.createTemplatedComment(
        Number(issue?.number),
        config.unassignedComment,
        {
          handle: commenterLogin,
          pin_label: config.pinLabel,
        },
      ),
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
