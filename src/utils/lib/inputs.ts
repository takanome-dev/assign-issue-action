export enum INPUTS {
  SELF_ASSIGN_CMD = 'self_assign_cmd',
  SELF_UNASSIGN_CMD = 'self_unassign_cmd',
  ASSIGN_USER_CMD = 'assign_user_cmd',
  UNASSIGN_USER_CMD = 'unassign_user_cmd',

  GITHUB_TOKEN = 'github_token',
  MAINTAINERS = 'maintainers',
  ENABLE_AUTO_SUGGESTION = 'enable_auto_suggestion',

  ASSIGNED_LABEL = 'assigned_label',
  REQUIRED_LABEL = 'required_label',
  PIN_LABEL = 'pin_label',

  DAYS_UNTIL_UNASSIGN = 'days_until_unassign',
  STALE_ASSIGNMENT_LABEL = 'stale_assignment_label',

  ASSIGNED_COMMENT = 'assigned_comment',
  UNASSIGNED_COMMENT = 'unassigned_comment',
  ALREADY_ASSIGNED_COMMENT = 'already_assigned_comment',
  ASSIGNMENT_SUGGESTION_COMMENT = 'assignment_suggestion_comment',
  BLOCK_ASSIGNMENT_COMMENT = 'block_assignment_comment',
}
