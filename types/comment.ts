export interface AlreadyAssignedCommentArg {
  total_days: string
  days_remaining: number
  handle: string
  assignee: string
}

export interface AssignmentInterestCommentArg {
  handle: string
  trigger: string
}

export interface AssignUserCommentArg {
  unassigned_date: string
  total_days: number
  handle: string
  pin_label: string
  /** Total number of PRs by the contributor */
  prs_total: number
  /** Number of merged PRs by the contributor */
  prs_merged: number
  /** Number of unmerged PRs by the contributor */
  prs_unmerged: number
  /** Percentage of merged PRs (0-100) */
  prs_merged_percentage: number
}

export interface UnAssignUserCommentArg {
  handle: string
  pin_label: string
}

export interface ClosedIssueAssignmentCommentArg {
  handle: string
}
