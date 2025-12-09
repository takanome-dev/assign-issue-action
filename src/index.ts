import { context } from '@actions/github'
import * as core from '@actions/core'

import CommentHandler from './handlers/comment-handler'
import ScheduleHandler from './handlers/schedule-handler'

;(async () => {
  const event = context.eventName

  try {
    if (event === 'issue_comment') {
      const cmtHandler = new CommentHandler()
      await cmtHandler.handle_issue_comment()
    } else if (event === 'workflow_dispatch' || event === 'schedule') {
      const scheduleHandler = new ScheduleHandler()
      await scheduleHandler.handle_unassignments()
    } else {
      return
    }
  } catch (error) {
    if (error instanceof Error) return core.setFailed(error.message)
  }
})()
