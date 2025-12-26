import type { ActionConfig } from '../core'
import { CommandType, type ParsedCommand } from './types'

const CONTRIBUTION_PHRASES = [
  'asssign-me',
  'Assign this issue to me',
  'Assign it to me',
  'Assign to me',
  'Assign me',
  'Assign me this issue',
  'Assign this for me',
  'Available to work on',
  'Can I be assigned to this issue',
  'can I kindly work on this issue',
  'Can I take on this issue',
  'Can I take this issue',
  'Can I take up this issue',
  'Can I work on it',
  'Could I get assigned',
  "I'd like to be assigned to",
  "I'm keen to have a go",
  'I am here to do a university assignment',
  'I am interested in taking on this issue',
  'I am interested in the issue',
  'I am very interested in this issue',
  'I hope to contribute to this issue',
  'I would like to work on this issue',
  'Interested to work',
  'is this free to take',
  'May I do this feature',
  'May I take it',
  'May I work on this issue',
  'Please assign',
  'Still open for contribution',
  'Want to take this issue',
  'Want to contribute',
  'Would be happy to pick this up',
  'Would like to work on this',
  'Would like to contribute',
  'Would love to work on this issue',
]

export class CommandParser {
  constructor(private readonly config: ActionConfig) {}

  /**
   * Parse a comment body into a command
   */
  parse(rawBody: string, commenterLogin: string): ParsedCommand | null {
    // Normalize: replace leading backslash with slash
    const body = rawBody.replace(/^\\/, '/').toLowerCase()

    // Ignore quoted replies
    if (body.trim().startsWith('>')) {
      return null
    }

    // Ignore maintainers using self-assignment commands
    if (
      this.config.maintainers.includes(commenterLogin) &&
      (body.includes(this.config.selfAssignCmd) ||
        body.includes(this.config.selfUnassignCmd))
    ) {
      return null
    }

    const {
      selfAssignCmd,
      selfUnassignCmd,
      assignUserCmd,
      unassignUserCmd,
      enableAutoSuggestion,
    } = this.config

    // Check auto-suggestion first
    if (
      enableAutoSuggestion &&
      CONTRIBUTION_PHRASES.some((phrase) =>
        body.toLowerCase().includes(phrase.toLowerCase()),
      )
    ) {
      return { type: CommandType.AUTO_SUGGEST }
    }

    // Self-assign
    if (body === selfAssignCmd || body.includes(selfAssignCmd)) {
      return { type: CommandType.SELF_ASSIGN }
    }

    // Self-unassign
    if (body === selfUnassignCmd || body.includes(selfUnassignCmd)) {
      return { type: CommandType.SELF_UNASSIGN }
    }

    // Assign user (maintainer only)
    if (body.includes(assignUserCmd)) {
      const targetUsername = this.extractUsername(rawBody, assignUserCmd)
      return {
        type: CommandType.ASSIGN_USER,
        targetUsername,
      }
    }

    // Unassign user (maintainer only)
    if (body.includes(unassignUserCmd)) {
      const targetUsername = this.extractUsername(rawBody, unassignUserCmd)
      return {
        type: CommandType.UNASSIGN_USER,
        targetUsername,
      }
    }

    return null
  }

  /**
   * Check if a command is maintainer-only
   */
  isMaintainerCommand(command: ParsedCommand): boolean {
    return (
      command.type === CommandType.ASSIGN_USER ||
      command.type === CommandType.UNASSIGN_USER
    )
  }

  /**
   * Extract @username from the text after a command
   */
  private extractUsername(rawBody: string, command: string): string | undefined {
    const lowerBody = rawBody.toLowerCase()
    const idx = lowerBody.indexOf(command.toLowerCase())

    if (idx === -1) return undefined

    const afterCmd = rawBody.slice(idx + command.length).trim()
    const match = afterCmd.match(/@([a-zA-Z0-9-]{1,39})/i)

    return match?.[1]
  }
}

export { CONTRIBUTION_PHRASES }
