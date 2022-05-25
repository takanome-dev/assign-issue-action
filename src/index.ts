import * as core from '@actions/core';
import * as github from '@actions/github';
import commentHandler from './lib/comment-handler';
import scheduleHandler from './lib/schedule-handler';

export type Core = typeof core;
export type Github = typeof github;

async function AssignToMeAction() {
  try {
    if (github.context.eventName === 'issue_comment') {
      await commentHandler(core, github);
    } else if (github.context.eventName === 'workflow_dispatch') {
      await scheduleHandler(core);
    } else {
      throw new Error(`Unhandled event ${github.context.eventName}`);
    }
  } catch (error) {
    if (error instanceof Error) return core.setFailed(error.message);
  }
}

AssignToMeAction();
