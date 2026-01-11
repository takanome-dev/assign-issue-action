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

  ASSIGNED_COMMENT = 'assigned_comment',
  ASSIGNED_COMMENT_NEWCOMER = 'assigned_comment_newcomer',
  UNASSIGNED_COMMENT = 'unassigned_comment',
  ALREADY_ASSIGNED_COMMENT = 'already_assigned_comment',
  ALREADY_ASSIGNED_COMMENT_PINNED = 'already_assigned_comment_pinned',
  ASSIGNMENT_SUGGESTION_COMMENT = 'assignment_suggestion_comment',
  BLOCK_ASSIGNMENT_COMMENT = 'block_assignment_comment',
  ENABLE_REMINDER = 'enable_reminder',
  REMINDER_DAYS = 'reminder_days',
  REMINDER_COMMENT = 'reminder_comment',

  MAX_ASSIGNMENTS = 'max_assignments',
  MAX_ASSIGNMENTS_MESSAGE = 'max_assignments_message',

  MAX_OVERALL_ASSIGNMENT_LABELS = 'max_overall_assignment_labels',
  MAX_OVERALL_ASSIGNMENT_COUNT = 'max_overall_assignment_count',
  MAX_OVERALL_ASSIGNMENT_MESSAGE = 'max_overall_assignment_message',

  SELF_ASSIGN_AUTHOR_BLOCKED_COMMENT = 'self_assign_author_blocked_comment',

  IGNORED_USERS = 'ignored_users',
  IGNORED_MESSAGE = 'ignored_message',

  CLOSED_ISSUE_ASSIGNMENT_COMMENT = 'closed_issue_assignment_comment',
}
