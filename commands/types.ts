import type { WebhookPayload } from '@actions/github/lib/interfaces'
import type { ActionConfig } from '../core'
import type {
  AssignmentValidator,
  NewcomerChecker,
} from '../services/assignment'
import type {
  CommentService,
  IssueService,
  TeamService,
} from '../services/github'
import type { GhComment, GhIssue } from '../types'

export enum CommandType {
  SELF_ASSIGN = 'self_assign',
  SELF_UNASSIGN = 'self_unassign',
  ASSIGN_USER = 'assign_user',
  UNASSIGN_USER = 'unassign_user',
  AUTO_SUGGEST = 'auto_suggest',
}

export interface ParsedCommand {
  type: CommandType
  targetUsername?: string // For assign/unassign user commands
}

export interface CommandContext {
  issue: WebhookPayload['issue'] | GhIssue
  comment: WebhookPayload['comment'] | GhComment
  config: ActionConfig
  repoOwner: string
  repoName: string
}

export interface CommandServices {
  issueService: IssueService
  commentService: CommentService
  teamService: TeamService
  validator: AssignmentValidator
  newcomerChecker: NewcomerChecker
}

export interface CommandResult {
  success: boolean
  message?: string
  output?: Record<string, unknown>
}

export interface Command {
  execute(
    context: CommandContext,
    services: CommandServices,
  ): Promise<CommandResult>
}
