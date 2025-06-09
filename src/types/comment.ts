export interface AlreadyAssignedCommentArg {
  total_days: string;
  handle: string;
  assignee: string;
}

export interface AssignmentInterestCommentArg {
  handle: string;
  trigger: string;
}

export interface AssignUserCommentArg {
  unassigned_date: string;
  total_days: number;
  handle: string;
  pin_label: string;
}

export interface UnAssignUserCommentArg {
  handle: string;
  pin_label: string;
}
