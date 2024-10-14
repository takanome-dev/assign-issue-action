import { setFailed } from '@actions/core';
import { context } from '@actions/github';

(async () => {
  const event = context.eventName;

  try {
    if (event === 'issue_comment') {
      const issue = new Comment();
      await issue.handleAssignIssue();
    } else if (event === 'workflow_dispatch' || event === 'schedule') {
      await scheduleHandler();
    } else {
      return;
    }
  } catch (error) {
    if (error instanceof Error) return setFailed(error.message);
  }
})();
