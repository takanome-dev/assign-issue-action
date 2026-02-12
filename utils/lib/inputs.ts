export enum INPUTS {
  SELF_ASSIGN_CMD = 'self_assign_cmd',
  SELF_UNASSIGN_CMD = 'self_unassign_cmd',
  ASSIGN_USER_CMD = 'assign_user_cmd',
  UNASSIGN_USER_CMD = 'unassign_user_cmd',

  GITHUB_TOKEN = 'github_token',
  MAINTAINERS = 'maintainers',
  ENABLE_AUTO_SUGGESTION = 'enable_auto_suggestion',
  ALLOW_SELF_ASSIGN_AUTHOR = 'allow_self_assign_author',

  ASSIGNED_LABEL = 'assigned_label',
  REQUIRED_LABEL = 'required_label',
  PIN_LABEL = 'pin_label',

  DAYS_UNTIL_UNASSIGN = 'days_until_unassign',
  STALE_ASSIGNMENT_LABEL = 'stale_assignment_label',

  ASSIGNED_TEXT = 'assigned_text',
  ASSIGNED_NEWCOMER_TEXT = 'assigned_newcomer_text',
  UNASSIGNED_TEXT = 'unassigned_text',
  SELF_UNASSIGNED_TEXT = 'self_unassigned_text',
  ALREADY_ASSIGNED_TEXT = 'already_assigned_text',
  ALREADY_ASSIGNED_PINNED_TEXT = 'already_assigned_pinned_text',
  ASSIGNMENT_SUGGESTION_TEXT = 'assignment_suggestion_text',
  BLOCK_ASSIGNMENT_TEXT = 'block_assignment_text',
  ENABLE_REMINDER = 'enable_reminder',
  REMINDER_DAYS = 'reminder_days',
  REMINDER_TEXT = 'reminder_text',

  MAX_ASSIGNMENTS = 'max_assignments',
  MAX_ASSIGNMENTS_TEXT = 'max_assignments_text',

  MAX_OVERALL_ASSIGNMENT_LABELS = 'max_overall_assignment_labels',
  MAX_OVERALL_ASSIGNMENT_COUNT = 'max_overall_assignment_count',
  MAX_OVERALL_ASSIGNMENT_TEXT = 'max_overall_assignment_text',

  SELF_ASSIGN_AUTHOR_BLOCKED_TEXT = 'self_assign_author_blocked_text',

  IGNORED_USERS = 'ignored_users',
  IGNORED_TEXT = 'ignored_text',

  CLOSED_ISSUE_ASSIGNMENT_TEXT = 'closed_issue_assignment_text',

  // Deprecated inputs (for backward compatibility)
  ASSIGNED_COMMENT = 'assigned_comment',
  ASSIGNED_COMMENT_NEWCOMER = 'assigned_comment_newcomer',
  UNASSIGNED_COMMENT = 'unassigned_comment',
  ALREADY_ASSIGNED_COMMENT = 'already_assigned_comment',
  ALREADY_ASSIGNED_COMMENT_PINNED = 'already_assigned_comment_pinned',
  ASSIGNMENT_SUGGESTION_COMMENT = 'assignment_suggestion_comment',
  BLOCK_ASSIGNMENT_COMMENT = 'block_assignment_comment',
  REMINDER_COMMENT = 'reminder_comment',
  MAX_ASSIGNMENTS_MESSAGE = 'max_assignments_message',
  MAX_OVERALL_ASSIGNMENT_MESSAGE = 'max_overall_assignment_message',
  SELF_ASSIGN_AUTHOR_BLOCKED_COMMENT = 'self_assign_author_blocked_comment',
  IGNORED_MESSAGE = 'ignored_message',

  CLOSED_ISSUE_ASSIGNMENT_COMMENT = 'closed_issue_assignment_comment',
}
