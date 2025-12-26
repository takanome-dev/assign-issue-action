import * as core from '@actions/core'
import { context } from '@actions/github'
import type { WebhookPayload } from '@actions/github/lib/interfaces'
import {
  AssignUserCommand,
  AutoSuggestCommand,
  type Command,
  type CommandContext,
  CommandParser,
  type CommandServices,
  CommandType,
  type ParsedCommand,
  SelfAssignCommand,
  SelfUnassignCommand,
  UnassignUserCommand,
} from '../commands'
import {
  type ActionConfig,
  createOctokitClient,
  getConfig,
  type OctokitClient,
} from '../core'
import { AssignmentValidator, NewcomerChecker } from '../services/assignment'
import {
  CommentService,
  IssueService,
  type RepoContext,
  TeamService,
} from '../services/github'
import type { GhComment, GhIssue } from '../types'

export default class CommentHandler {
  private readonly issue: WebhookPayload['issue'] | GhIssue
  private readonly comment: WebhookPayload['comment'] | GhComment
  private readonly config: ActionConfig
  private readonly octokit: OctokitClient

  // Services
  private readonly services: CommandServices
  private readonly parser: CommandParser
  private readonly teamService: TeamService

  constructor() {
    this.config = getConfig()
    this.issue = context.payload.issue
    this.comment = context.payload.comment
    this.octokit = createOctokitClient(this.config.githubToken)

    // Initialize services
    const repoContext: RepoContext = {
      owner: context.repo.owner,
      repo: context.repo.repo,
    }

    const issueService = new IssueService(this.octokit, repoContext)
    const commentService = new CommentService(this.octokit, repoContext)
    this.teamService = new TeamService(this.octokit)

    this.services = {
      issueService,
      commentService,
      teamService: this.teamService,
      validator: new AssignmentValidator(issueService, this.config),
      newcomerChecker: new NewcomerChecker(issueService),
    }

    this.parser = new CommandParser(this.config)
  }

  async handle_issue_comment(): Promise<void> {
    core.info(
      `🤖 Checking commands in the issue (#${this.issue?.number}) comments"`,
    )

    // Check required label
    const { requiredLabel } = this.config
    if (requiredLabel) {
      const hasLabel = this.issue?.labels?.find(
        (label: { name: string }) => label.name === requiredLabel,
      )

      if (!hasLabel) {
        return core.setFailed(
          `🚫 Missing required label: "${requiredLabel}" not found in issue #${this.issue?.number}.`,
        )
      }
    }

    // Parse command from comment body
    const rawBody = context.payload.comment?.body as string
    const commenterLogin = this.comment?.user?.login

    const parsedCommand = this.parser.parse(rawBody, commenterLogin)

    if (!parsedCommand) {
      return core.info(
        `🤖 Ignoring comment: ${context.payload.comment?.id} because it does not contain a supported command.`,
      )
    }

    // Check maintainer permissions for maintainer-only commands
    if (this.parser.isMaintainerCommand(parsedCommand)) {
      if (this.config.maintainers.length === 0) {
        return core.info(
          `🤖 Ignoring maintainer command because the "maintainers" input is empty`,
        )
      }

      const resolvedMaintainers = await this.teamService.resolveMaintainers(
        this.config.maintainers,
      )

      if (!resolvedMaintainers.includes(commenterLogin)) {
        return core.info(
          `🤖 Ignoring maintainer command because user @${commenterLogin} is not in the maintainers list`,
        )
      }
    }

    // Get the appropriate command handler
    const command = this.getCommand(parsedCommand)

    if (!command) {
      return core.info(`🤖 Unknown command type: ${parsedCommand.type}`)
    }

    // Build command context
    const commandContext: CommandContext = {
      issue: this.issue,
      comment: this.comment,
      config: this.config,
      repoOwner: context.repo.owner,
      repoName: context.repo.repo,
    }

    // Execute the command
    await command.execute(commandContext, this.services)
  }

  private getCommand(parsedCommand: ParsedCommand): Command | null {
    switch (parsedCommand.type) {
      case CommandType.SELF_ASSIGN:
        return new SelfAssignCommand()
      case CommandType.SELF_UNASSIGN:
        return new SelfUnassignCommand()
      case CommandType.ASSIGN_USER:
        return new AssignUserCommand(parsedCommand)
      case CommandType.UNASSIGN_USER:
        return new UnassignUserCommand(parsedCommand)
      case CommandType.AUTO_SUGGEST:
        return new AutoSuggestCommand()
      default:
        return null
    }
  }
}
