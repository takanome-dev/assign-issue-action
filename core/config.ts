import * as core from '@actions/core'
import { INPUTS } from '../utils/lib/inputs'

export interface ActionConfig {
  // Authentication
  githubToken: string

  // Commands
  selfAssignCmd: string
  selfUnassignCmd: string
  assignUserCmd: string
  unassignUserCmd: string

  // Labels
  assignedLabel: string
  requiredLabel: string
  pinLabel: string
  staleAssignmentLabel: string

  // Settings
  daysUntilUnassign: number
  maintainers: string[]
  enableAutoSuggestion: boolean
  allowSelfAssignAuthor: boolean
  blockAssignment: boolean

  // Assignment limits
  maxAssignments: number
  maxOverallAssignmentLabels: string[]
  maxOverallAssignmentCount: number

  // Reminders
  enableReminder: boolean
  reminderDays: number | 'auto'

  // Text templates
  assignedText: string
  assignedNewcomerText: string
  unassignedText: string
  selfUnassignedText: string
  alreadyAssignedText: string
  alreadyAssignedPinnedText: string
  assignmentSuggestionText: string
  blockAssignmentText: string
  reminderText: string
  maxAssignmentsText: string
  maxOverallAssignmentText: string
  selfAssignAuthorBlockedText: string

  // Ignored users
  ignoredUsers: string[]
  ignoredText: string

  // Closed issue handling
  closedIssueAssignmentText: string
}

let cachedConfig: ActionConfig | null = null

export function getConfig(): ActionConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  cachedConfig = loadConfig()
  return cachedConfig
}

export function loadConfig(): ActionConfig {
  const githubToken = core.getInput(INPUTS.GITHUB_TOKEN)

  if (!githubToken) {
    throw new Error('Missing required input: github_token')
  }

  const maintainersInput = core.getInput(INPUTS.MAINTAINERS)
  const maxOverallLabelsInput = core.getInput(
    INPUTS.MAX_OVERALL_ASSIGNMENT_LABELS,
  )

  const reminderDaysInput = core.getInput(INPUTS.REMINDER_DAYS)
  let reminderDays: number | 'auto' = 'auto'
  if (reminderDaysInput !== 'auto') {
    const parsed = Number.parseInt(reminderDaysInput, 10)
    reminderDays = Number.isNaN(parsed) ? 'auto' : parsed
  }

  return {
    // Authentication
    githubToken,

    // Commands
    selfAssignCmd: core.getInput(INPUTS.SELF_ASSIGN_CMD),
    selfUnassignCmd: core.getInput(INPUTS.SELF_UNASSIGN_CMD),
    assignUserCmd: core.getInput(INPUTS.ASSIGN_USER_CMD),
    unassignUserCmd: core.getInput(INPUTS.UNASSIGN_USER_CMD),

    // Labels
    assignedLabel: core.getInput(INPUTS.ASSIGNED_LABEL),
    requiredLabel: core.getInput(INPUTS.REQUIRED_LABEL),
    pinLabel: core.getInput(INPUTS.PIN_LABEL),
    staleAssignmentLabel: core.getInput(INPUTS.STALE_ASSIGNMENT_LABEL),

    // Settings
    daysUntilUnassign: Number(core.getInput(INPUTS.DAYS_UNTIL_UNASSIGN)) || 14,
    maintainers: maintainersInput
      ? maintainersInput
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean)
      : [],
    enableAutoSuggestion: core.getBooleanInput(INPUTS.ENABLE_AUTO_SUGGESTION),
    allowSelfAssignAuthor:
      core.getInput(INPUTS.ALLOW_SELF_ASSIGN_AUTHOR) !== 'false',
    blockAssignment: core.getInput('block_assignment') === 'true',

    // Assignment limits
    maxAssignments: Number.parseInt(
      core.getInput(INPUTS.MAX_ASSIGNMENTS) || '3',
      10,
    ),
    maxOverallAssignmentLabels: maxOverallLabelsInput
      ? maxOverallLabelsInput
          .split(',')
          .map((l) => l.trim())
          .filter(Boolean)
      : [],
    maxOverallAssignmentCount: Number.parseInt(
      core.getInput(INPUTS.MAX_OVERALL_ASSIGNMENT_COUNT) || '0',
      10,
    ),

    // Reminders
    enableReminder: core.getInput(INPUTS.ENABLE_REMINDER) === 'true',
    reminderDays,

    // Text templates
    assignedText: core.getInput(INPUTS.ASSIGNED_TEXT),
    assignedNewcomerText: core.getInput(INPUTS.ASSIGNED_NEWCOMER_TEXT),
    unassignedText: core.getInput(INPUTS.UNASSIGNED_TEXT),
    selfUnassignedText:
      core.getInput(INPUTS.SELF_UNASSIGNED_TEXT) ||
      core.getInput(INPUTS.UNASSIGNED_TEXT),
    alreadyAssignedText: core.getInput(INPUTS.ALREADY_ASSIGNED_TEXT),
    alreadyAssignedPinnedText: core.getInput(
      INPUTS.ALREADY_ASSIGNED_PINNED_TEXT,
    ),
    assignmentSuggestionText: core.getInput(INPUTS.ASSIGNMENT_SUGGESTION_TEXT),
    blockAssignmentText: core.getInput(INPUTS.BLOCK_ASSIGNMENT_TEXT),
    reminderText: core.getInput(INPUTS.REMINDER_TEXT),
    maxAssignmentsText: core.getInput(INPUTS.MAX_ASSIGNMENTS_TEXT),
    maxOverallAssignmentText: core.getInput(INPUTS.MAX_OVERALL_ASSIGNMENT_TEXT),
    selfAssignAuthorBlockedText: core.getInput(
      INPUTS.SELF_ASSIGN_AUTHOR_BLOCKED_TEXT,
    ),

    // Ignored users
    ignoredUsers: core.getInput(INPUTS.IGNORED_USERS)
      ? core
          .getInput(INPUTS.IGNORED_USERS)
          .split(',')
          .map((u) => u.trim())
          .filter(Boolean)
      : [],
    ignoredText: core.getInput(INPUTS.IGNORED_TEXT),

    // Closed issue handling
    closedIssueAssignmentText: core.getInput(
      INPUTS.CLOSED_ISSUE_ASSIGNMENT_TEXT,
    ),
  }
}

/**
 * Reset the cached config (useful for testing)
 */
export function resetConfig(): void {
  cachedConfig = null
}
