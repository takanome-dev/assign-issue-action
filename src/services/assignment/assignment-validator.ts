import mustache from 'mustache'
import type { ActionConfig } from '../../core'
import type { IssueService } from '../github'

export interface ValidationResult {
  valid: boolean
  reason?: string
}

export interface IssueContext {
  number: number
  assignee?: { login: string } | null
  assignees?: Array<{ login: string }> | null
  user?: { login: string } | null
  labels?: Array<{ name?: string } | string>
}

export class AssignmentValidator {
  constructor(
    private readonly issueService: IssueService,
    private readonly config: ActionConfig,
  ) {}

  /**
   * Check if an issue is already assigned
   */
  isAlreadyAssigned(issue: IssueContext): boolean {
    return !!(issue.assignee || (issue.assignees?.length ?? 0) > 0)
  }

  /**
   * Check if the issue has a pin label (exempt from unassignment)
   */
  isIssuePinned(issue: IssueContext): boolean {
    const { pinLabel } = this.config
    return (
      issue.labels?.some((label) => {
        const labelName = typeof label === 'string' ? label : label.name
        return labelName === pinLabel
      }) ?? false
    )
  }

  /**
   * Check if issue has the required label (if configured)
   */
  hasRequiredLabel(issue: IssueContext): ValidationResult {
    const { requiredLabel } = this.config

    if (!requiredLabel) {
      return { valid: true }
    }

    const hasLabel = issue.labels?.some((label) => {
      const labelName = typeof label === 'string' ? label : label.name
      return labelName === requiredLabel
    })

    return {
      valid: !!hasLabel,
      reason: hasLabel
        ? undefined
        : `Missing required label: "${requiredLabel}" not found in issue #${issue.number}`,
    }
  }

  /**
   * Check if a user can self-assign their own issue
   */
  canSelfAssignOwnIssue(
    issue: IssueContext,
    commenterLogin: string,
  ): ValidationResult {
    const { allowSelfAssignAuthor } = this.config

    if (allowSelfAssignAuthor) {
      return { valid: true }
    }

    const isAuthor = issue.user?.login === commenterLogin

    return {
      valid: !isAuthor,
      reason: isAuthor
        ? `User @${commenterLogin} cannot self-assign their own issue #${issue.number}`
        : undefined,
    }
  }

  /**
   * Check if user was previously unassigned and is blocked from reassignment
   */
  async wasBlockedFromReassignment(
    issueNumber: number,
    username: string,
  ): Promise<ValidationResult> {
    const { blockAssignment, unassignUserCmd, unassignedComment } = this.config

    if (!blockAssignment) {
      return { valid: true }
    }

    const comments = await this.issueService.getComments(issueNumber)

    const wasUnassigned = comments.some((comment) => {
      const hasManualUnassign = comment.body?.includes(
        `${unassignUserCmd} @${username}`,
      )
      const hasAutoUnassign = comment.body?.includes(
        mustache.render(unassignedComment, { handle: username }),
      )
      return hasManualUnassign || hasAutoUnassign
    })

    return {
      valid: !wasUnassigned,
      reason: wasUnassigned
        ? `User @${username} was previously unassigned from issue #${issueNumber}`
        : undefined,
    }
  }

  /**
   * Check if user has reached max assignment count
   */
  async hasReachedMaxAssignments(username: string): Promise<ValidationResult> {
    const { maxAssignments } = this.config
    const count = await this.issueService.getAssignmentCount(username)

    return {
      valid: count < maxAssignments,
      reason:
        count >= maxAssignments
          ? `User @${username} has reached the maximum number of assignments (${maxAssignments})`
          : undefined,
    }
  }

  /**
   * Check if user has reached per-label assignment limits
   */
  async hasReachedLabelLimit(
    username: string,
    issueLabels: Array<{ name?: string } | string>,
  ): Promise<ValidationResult> {
    const { maxOverallAssignmentLabels, maxOverallAssignmentCount } = this.config

    if (
      maxOverallAssignmentLabels.length === 0 ||
      maxOverallAssignmentCount <= 0
    ) {
      return { valid: true }
    }

    // Get current issue's labels
    const currentLabels = issueLabels.map((l) =>
      typeof l === 'string' ? l : l.name ?? '',
    )

    // Find which tracked labels are on this issue
    const matchingLabels = currentLabels.filter((label) =>
      maxOverallAssignmentLabels.includes(label),
    )

    if (matchingLabels.length === 0) {
      return { valid: true }
    }

    // Get assignment counts for all tracked labels
    const labelCounts = await this.issueService.getAssignmentCountPerLabel(
      username,
      maxOverallAssignmentLabels,
    )

    // Check if user has reached limit for any of the current issue's labels
    for (const label of matchingLabels) {
      const count = labelCounts.get(label) ?? 0
      if (count >= maxOverallAssignmentCount) {
        return {
          valid: false,
          reason: `User @${username} has reached the assignment limit for label "${label}" (${count}/${maxOverallAssignmentCount})`,
        }
      }
    }

    return { valid: true }
  }

  /**
   * Run all pre-assignment validations
   */
  async validateAssignment(
    issue: IssueContext,
    username: string,
  ): Promise<ValidationResult> {
    // Check if already assigned
    if (this.isAlreadyAssigned(issue)) {
      const assignee = issue.assignee?.login ?? 'unknown'
      return {
        valid: false,
        reason: `Issue #${issue.number} is already assigned to @${assignee}`,
      }
    }

    // Check required label
    const requiredLabelCheck = this.hasRequiredLabel(issue)
    if (!requiredLabelCheck.valid) {
      return requiredLabelCheck
    }

    // Check self-assign author
    const selfAssignCheck = this.canSelfAssignOwnIssue(issue, username)
    if (!selfAssignCheck.valid) {
      return selfAssignCheck
    }

    // Check blocked from reassignment
    const blockedCheck = await this.wasBlockedFromReassignment(
      issue.number,
      username,
    )
    if (!blockedCheck.valid) {
      return blockedCheck
    }

    // Check max assignments
    const maxCheck = await this.hasReachedMaxAssignments(username)
    if (!maxCheck.valid) {
      return maxCheck
    }

    // Check per-label limits
    const labelLimitCheck = await this.hasReachedLabelLimit(
      username,
      issue.labels ?? [],
    )
    if (!labelLimitCheck.valid) {
      return labelLimitCheck
    }

    return { valid: true }
  }
}
