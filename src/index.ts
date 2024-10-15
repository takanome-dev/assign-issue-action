import { setFailed } from '@actions/core';
import { context } from '@actions/github';
import Comment from './comment';
import scheduleHandler from './utils/lib/schedule';

(async () => {
  const event = context.eventName;

  try {
    if (event === 'issue_comment') {
      const issue = new Comment();
      await issue.handle_issue_comment();
    } else if (event === 'workflow_dispatch' || event === 'schedule') {
      await scheduleHandler();
    } else {
      return;
    }
  } catch (error) {
    if (error instanceof Error) return setFailed(error.message);
  }
})();
