#!/usr/bin/env node

/**
 * Local testing tool for assign-issue-action
 * Usage: node scripts/test-action.js [options]
 */

import { Octokit } from '@octokit/core';
import { throttling } from '@octokit/plugin-throttling';

const MyOctokit = Octokit.plugin(throttling);

// Configuration
const config = {
  token: process.env.GITHUB_TOKEN,
  owner: process.env.GITHUB_OWNER || 'JabRef',
  repo: process.env.GITHUB_REPO || 'jabref',
  assignedLabel: process.env.ASSIGNED_LABEL || '📍 Assigned',
  exemptLabel: process.env.EXEMPT_LABEL || '📌 Pinned',
  daysUntilUnassign: parseInt(process.env.DAYS_UNTIL_UNASSIGN || '21'),
};

function since(days) {
  const totalDaysInMilliseconds = days * 24 * 60 * 60 * 1000;
  const date = new Date(+new Date() - totalDaysInMilliseconds);
  return new Date(date).toISOString().substring(0, 10);
}

async function testSearchQueries() {
  if (!config.token) {
    console.error('❌ GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }

  const octokit = new MyOctokit({
    auth: config.token,
    throttle: {
      onRateLimit: (retryAfter, options) => {
        console.warn(
          `⚠️ Request quota exhausted for request ${options.method} ${options.url}`,
        );
        return true;
      },
      onSecondaryRateLimit: (retryAfter, options) => {
        console.warn(
          `⚠️ SecondaryRateLimit detected for request ${options.method} ${options.url}`,
        );
      },
    },
  });

  console.log('🔧 Testing assign-issue-action search queries');
  console.log('📊 Configuration:', {
    owner: config.owner,
    repo: config.repo,
    assignedLabel: config.assignedLabel,
    exemptLabel: config.exemptLabel,
    daysUntilUnassign: config.daysUntilUnassign,
  });

  const reminderDays = Math.floor(config.daysUntilUnassign / 2);
  const timestamp = since(config.daysUntilUnassign);

  console.log(
    `⏱️ Unassign after ${config.daysUntilUnassign} days, remind after ${reminderDays} days`,
  );
  console.log(`📅 Timestamp for filtering: ${timestamp}`);

  try {
    const query = `repo:${config.owner}/${config.repo} is:issue is:open label:"${config.assignedLabel}" assignee:* -label:"${config.exemptLabel}" updated:<=${timestamp}`;
    console.log(`Query: ${query}`);
    const result = await octokit.request('GET /search/issues', {
      q: query,
      per_page: 100,
      advanced_search: true,
    });
    console.log(`Results: ${result.data.total_count} issues`);

    // Show some sample issues for debugging
    if (result.data.total_count > 0) {
      console.log('\n📋 Sample issues found:');

      const issues = result.data.items.slice(0, 10); // Show first 10 issues
      const reminderIssues = [];
      const unassignIssues = [];
      const otherIssues = [];

      // Simulate the categorization logic
      for (const issue of issues) {
        const updatedDate = new Date(issue.updated_at);
        const daysSinceUpdate = Math.floor(
          (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Check for reminder-sent label
        const hasReminderLabel = issue.labels?.some(
          (label) => label.name === '🔔 reminder-sent',
        );

        if (daysSinceUpdate >= config.daysUntilUnassign) {
          unassignIssues.push({ issue, daysSinceUpdate, hasReminderLabel });
        } else if (daysSinceUpdate >= reminderDays && !hasReminderLabel) {
          reminderIssues.push({ issue, daysSinceUpdate, hasReminderLabel });
        } else {
          otherIssues.push({ issue, daysSinceUpdate, hasReminderLabel });
        }
      }

      // Display categorization summary
      console.log(
        `\n📊 Issue Categorization Summary (from ${issues.length} sample issues):`,
      );
      console.log(
        `┌─────────────────────────────────────────────────────────────┐`,
      );
      console.log(
        `│ 🔴 Issues to UNASSIGN: ${unassignIssues.length.toString().padStart(2)} (${config.daysUntilUnassign}+ days old)                │`,
      );
      console.log(
        `│ 🟡 Issues to REMIND:   ${reminderIssues.length.toString().padStart(2)} (${reminderDays}+ days, no reminder sent) │`,
      );
      console.log(
        `│ 🟢 Other issues:       ${otherIssues.length.toString().padStart(2)} (recent or already reminded)        │`,
      );
      console.log(
        `└─────────────────────────────────────────────────────────────┘`,
      );

      // Show unassignment issues table
      if (unassignIssues.length > 0) {
        console.log('\n🔴 ISSUES TO UNASSIGN:');
        console.log(
          '┌──────┬─────────────────────────────────────────────────┬──────────┬─────────────┬──────────────┐',
        );
        console.log(
          '│ #    │ Title                                           │ Days Old │ Assignee    │ Has Reminder │',
        );
        console.log(
          '├──────┼─────────────────────────────────────────────────┼──────────┼─────────────┼──────────────┤',
        );

        unassignIssues.forEach(
          ({ issue, daysSinceUpdate, hasReminderLabel }) => {
            const title =
              issue.title.length > 47
                ? issue.title.substring(0, 44) + '...'
                : issue.title;
            const assignee = issue.assignee?.login || 'None';
            const reminderStatus = hasReminderLabel ? 'Yes' : 'No';

            console.log(
              `│ ${issue.number.toString().padStart(4)} │ ${title.padEnd(47)} │ ${daysSinceUpdate.toString().padStart(8)} │ ${assignee.padEnd(11)} │ ${reminderStatus.padEnd(12)} │`,
            );
          },
        );

        console.log(
          '└──────┴─────────────────────────────────────────────────┴──────────┴─────────────┴──────────────┘',
        );
      }

      // Show reminder issues table
      if (reminderIssues.length > 0) {
        console.log('\n🟡 ISSUES TO REMIND:');
        console.log(
          '┌──────┬─────────────────────────────────────────────────┬──────────┬─────────────┬─────────────────┐',
        );
        console.log(
          '│ #    │ Title                                           │ Days Old │ Assignee    │ Days Until Auto │',
        );
        console.log(
          '├──────┼─────────────────────────────────────────────────┼──────────┼─────────────┼─────────────────┤',
        );

        reminderIssues.forEach(({ issue, daysSinceUpdate }) => {
          const title =
            issue.title.length > 47
              ? issue.title.substring(0, 44) + '...'
              : issue.title;
          const assignee = issue.assignee?.login || 'None';
          const daysUntilAuto = config.daysUntilUnassign - daysSinceUpdate;

          console.log(
            `│ ${issue.number.toString().padStart(4)} │ ${title.padEnd(47)} │ ${daysSinceUpdate.toString().padStart(8)} │ ${assignee.padEnd(11)} │ ${daysUntilAuto.toString().padStart(15)} │`,
          );
        });

        console.log(
          '└──────┴─────────────────────────────────────────────────┴──────────┴─────────────┴─────────────────┘',
        );
      }

      // Show other issues table (for debugging)
      if (otherIssues.length > 0) {
        console.log('\n🟢 OTHER ISSUES (no action needed):');
        console.log(
          '┌──────┬─────────────────────────────────────────────────┬──────────┬─────────────┬──────────────┐',
        );
        console.log(
          '│ #    │ Title                                           │ Days Old │ Assignee    │ Reason       │',
        );
        console.log(
          '├──────┼─────────────────────────────────────────────────┼──────────┼─────────────┼──────────────┤',
        );

        otherIssues.forEach(({ issue, daysSinceUpdate, hasReminderLabel }) => {
          const title =
            issue.title.length > 47
              ? issue.title.substring(0, 44) + '...'
              : issue.title;
          const assignee = issue.assignee?.login || 'None';
          let reason = '';

          if (daysSinceUpdate < reminderDays) {
            reason = 'Too recent';
          } else if (hasReminderLabel) {
            reason = 'Already reminded';
          } else {
            reason = 'Other';
          }

          console.log(
            `│ ${issue.number.toString().padStart(4)} │ ${title.padEnd(47)} │ ${daysSinceUpdate.toString().padStart(8)} │ ${assignee.padEnd(11)} │ ${reason.padEnd(12)} │`,
          );
        });

        console.log(
          '└──────┴─────────────────────────────────────────────────┴──────────┴─────────────┴──────────────┘',
        );
      }

      // Summary statistics
      console.log('\n📈 Statistics:');
      console.log(`  • Total issues found: ${result.data.total_count}`);
      console.log(`  • Sample analyzed: ${issues.length}`);
      console.log(`  • Would unassign: ${unassignIssues.length}`);
      console.log(`  • Would send reminders: ${reminderIssues.length}`);
      console.log(`  • No action needed: ${otherIssues.length}`);

      if (result.data.total_count > issues.length) {
        console.log(
          `  • Additional issues not shown: ${result.data.total_count - issues.length}`,
        );
      }
    } else {
      console.log('\n📋 No issues found matching the criteria.');
    }
  } catch (error) {
    console.error('❌ Error testing queries:', error);
  }
}

async function testUnassignLogic() {
  console.log('\n🧪 Testing unassignment logic...');

  // You can add more specific testing here
  console.log('This would test the actual unassignment logic');
}

// CLI argument parsing
const args = process.argv.slice(2);
const command = args[0] || 'search';

async function main() {
  switch (command) {
    case 'search':
      await testSearchQueries();
      break;
    case 'unassign':
      await testUnassignLogic();
      break;
    case 'help':
      console.log(`
Usage: node scripts/test-action.js [command]

Commands:
  search    Test search queries (default)
  unassign  Test unassignment logic
  help      Show this help

Environment Variables:
  GITHUB_TOKEN        GitHub token (required)
  GITHUB_OWNER        Repository owner (default: JabRef)
  GITHUB_REPO         Repository name (default: jabref)
  ASSIGNED_LABEL      Assigned label (default: 📍 Assigned)
  EXEMPT_LABEL        Exempt label (default: 📌 Pinned)
  DAYS_UNTIL_UNASSIGN Days until unassign (default: 21)

Example:
  GITHUB_TOKEN=your_token node scripts/test-action.js search
      `);
      break;
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Run "node scripts/test-action.js help" for usage');
      process.exit(1);
  }
}

main().catch(console.error);
