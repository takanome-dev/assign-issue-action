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

/**
 * Helper function to get input with backward compatibility for deprecated names
 * Checks new name first, then falls back to deprecated name with a warning
 */
function getInputWithDeprecation(
  newName: string,
  deprecatedName: string,
): string {
  const newValue = core.getInput(newName)
  const deprecatedValue = core.getInput(deprecatedName)

  if (deprecatedValue && !newValue) {
    core.warning(
      `⚠️ The input '${deprecatedName}' is deprecated and will be removed in a future version. Please use '${newName}' instead.`,
    )
    return deprecatedValue
  }

  return newValue
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

    // Text templates with backward compatibility
    assignedText: getInputWithDeprecation(
      INPUTS.ASSIGNED_TEXT,
      INPUTS.ASSIGNED_COMMENT,
    ),
    assignedNewcomerText: getInputWithDeprecation(
      INPUTS.ASSIGNED_NEWCOMER_TEXT,
      INPUTS.ASSIGNED_COMMENT_NEWCOMER,
    ),
    unassignedText: getInputWithDeprecation(
      INPUTS.UNASSIGNED_TEXT,
      INPUTS.UNASSIGNED_COMMENT,
    ),
    selfUnassignedText:
      getInputWithDeprecation(
        INPUTS.SELF_UNASSIGNED_TEXT,
        INPUTS.UNASSIGNED_COMMENT,
      ) ||
      getInputWithDeprecation(
        INPUTS.UNASSIGNED_TEXT,
        INPUTS.UNASSIGNED_COMMENT,
      ),
    alreadyAssignedText: getInputWithDeprecation(
      INPUTS.ALREADY_ASSIGNED_TEXT,
      INPUTS.ALREADY_ASSIGNED_COMMENT,
    ),
    alreadyAssignedPinnedText: getInputWithDeprecation(
      INPUTS.ALREADY_ASSIGNED_PINNED_TEXT,
      INPUTS.ALREADY_ASSIGNED_COMMENT_PINNED,
    ),
    assignmentSuggestionText: getInputWithDeprecation(
      INPUTS.ASSIGNMENT_SUGGESTION_TEXT,
      INPUTS.ASSIGNMENT_SUGGESTION_COMMENT,
    ),
    blockAssignmentText: getInputWithDeprecation(
      INPUTS.BLOCK_ASSIGNMENT_TEXT,
      INPUTS.BLOCK_ASSIGNMENT_COMMENT,
    ),
    reminderText: getInputWithDeprecation(
      INPUTS.REMINDER_TEXT,
      INPUTS.REMINDER_COMMENT,
    ),
    maxAssignmentsText: getInputWithDeprecation(
      INPUTS.MAX_ASSIGNMENTS_TEXT,
      INPUTS.MAX_ASSIGNMENTS_MESSAGE,
    ),
    maxOverallAssignmentText: getInputWithDeprecation(
      INPUTS.MAX_OVERALL_ASSIGNMENT_TEXT,
      INPUTS.MAX_OVERALL_ASSIGNMENT_MESSAGE,
    ),
    selfAssignAuthorBlockedText: getInputWithDeprecation(
      INPUTS.SELF_ASSIGN_AUTHOR_BLOCKED_TEXT,
      INPUTS.SELF_ASSIGN_AUTHOR_BLOCKED_COMMENT,
    ),

    // Ignored users
    ignoredUsers: core.getInput(INPUTS.IGNORED_USERS)
      ? core
          .getInput(INPUTS.IGNORED_USERS)
          .split(',')
          .map((u) => u.trim())
          .filter(Boolean)
      : [],
    ignoredText: getInputWithDeprecation(
      INPUTS.IGNORED_TEXT,
      INPUTS.IGNORED_MESSAGE,
    ),

    // Closed issue handling
    closedIssueAssignmentText: getInputWithDeprecation(
      INPUTS.CLOSED_ISSUE_ASSIGNMENT_TEXT,
      INPUTS.CLOSED_ISSUE_ASSIGNMENT_COMMENT,
    ),
  }
}

/**
 * Reset the cached config (useful for testing)
 */
export function resetConfig(): void {
  cachedConfig = null
}
