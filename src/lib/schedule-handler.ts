import { Core } from '..';
import StaleAssignments from './issue-processor';

export default async function scheduleHandler(core: Core) {
  const processor = new StaleAssignments();

  // Find all open issues with the assigned_label
  const issues = await processor.getStaleAssignments();

  core.info(`Processing ${issues.length} stale assignments:`);

  for (const issue of issues) {
    // Ensure that the issue is assigned to someone
    if (!issue.assignee) continue;

    // Unassign the user
    core.info(`-- Unassigning @${issue.assignee.login} from #${issue.number}`);
    await processor.unassignIssue(issue);

    core.info(`-- Done processing issue #${issue.number}`);
  }
}
