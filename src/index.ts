import * as core from '@actions/core';
import * as github from '@actions/github';
import Comment from './lib/comment';
import scheduleHandler from './lib/schedule';

export type Core = typeof core;
export type Github = typeof github;

(async () => {
  try {
    if (github.context.eventName === 'issue_comment') {
      const issue = new Comment(core, github);
      await issue.handleAssignIssue();
    } else if (
      github.context.eventName === 'workflow_dispatch' ||
      github.context.eventName === 'schedule'
    ) {
      await scheduleHandler(core);
    } else {
      return;
    }
  } catch (error) {
    if (error instanceof Error) return core.setFailed(error.message);
  }
})();
