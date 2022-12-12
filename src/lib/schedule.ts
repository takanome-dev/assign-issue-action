import { Core } from '..';
import IssueHandler from './issue';

export default async function scheduleHandler(core: Core) {
  const issueHandler = new IssueHandler();

  // Find all open issues with the assigned_label
  const issues = await issueHandler.getIssues();

  core.info(`⚙ Processing ${issues.length} issues:`);

  for (const issue of issues) {
    // Ensure that the issue is assigned to someone
    if (!issue.assignee) continue;

    // Unassign the user
    core.info(
      `🔗 UnAssigning @${issue.assignee.login} from issue #${issue.number}`
    );

    await issueHandler.unassignIssue(issue);

    core.info(`✅ Done processing issue #${issue.number}`);
  }
}
