import { context } from '@actions/github';
import * as core from '@actions/core';

import CommentHandler from './handlers/comment-handler';
import ScheduleHandler from './handlers/schedule-handler';
import { INPUTS } from './utils/lib/inputs';

(async () => {
  const event = context.eventName;

  try {
    if (event === 'issue_comment') {
      const cmtHandler = new CommentHandler();
      await cmtHandler.handle_issue_comment();
    } else if (event === 'workflow_dispatch' || event === 'schedule') {
      const scheduleHandler = new ScheduleHandler();

      // Process both reminders and unassignments
      if (event === 'schedule') {
        await scheduleHandler.handle_unassignments();
      } else if (event === 'workflow_dispatch') {
        // For manual runs, check which actions to perform
        const action = core.getInput(INPUTS.WORKFLOW_DISPATCH_ACTION) || 'all';

        if (action === 'all' || action === 'unassign') {
          await scheduleHandler.handle_unassignments();
        }

        if (action === 'all' || action === 'remind') {
          const enableReminder = core.getInput(INPUTS.ENABLE_REMINDER);
          if (enableReminder === 'true') {
            await scheduleHandler.send_reminders();
          }
        }
      }
    } else {
      return;
    }
  } catch (error) {
    if (error instanceof Error) return core.setFailed(error.message);
  }
})();
