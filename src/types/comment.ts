import { GhComment } from '../types';

export interface AlreadyAssignedCommentArg {
  unassigned_date: string;
  comment: GhComment;
  assignee: {
    login: string;
  };
}

export interface AssignUserCommentArg {
  unassigned_date: Date;
  totalDays: number;
  comment: GhComment;
  // env: any;
  // inputs: any;
}

export interface UnAssignUserCommentArg {
  comment: GhComment;
  // env: any;
  // inputs: any;
}
