import { info } from '@actions/core';

import IssueHandler from './issue';

export default async function scheduleHandler() {
  const issueHandler = new IssueHandler();

  // Find all open issues with the assigned_label
  const issues = await issueHandler.getIssues();

  info(`⚙ Processing ${issues.length} issues:`);

  for (const issue of issues) {
    // Ensure that the issue is assigned to someone
    if (!issue.assignee) continue;

    // Unassign the user
    info(`🔗 UnAssigning @${issue.assignee.login} from issue #${issue.number}`);

    await issueHandler.unassignIssue(issue);

    info(`✅ Done processing issue #${issue.number}`);
  }
}
