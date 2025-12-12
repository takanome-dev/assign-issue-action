import * as core from '@actions/core'
import { context } from '@actions/github'
import type { components } from '@octokit/openapi-types'

import {
  type ActionConfig,
  createOctokitClient,
  getConfig,
  type OctokitClient,
} from '../core'
import {
  CommentService,
  IssueService,
  type RepoContext,
} from '../services/github'
import { chunkArray, getDaysBetween } from '../utils/helpers/common'

type Issue = components['schemas']['issue-search-result-item']
type ExtendedIssue = {
  issue: Issue
  lastActivityDate: Date
  daysSinceActivity: number
  hasReminderLabel: boolean
}

export default class ScheduleHandler {
  private readonly config: ActionConfig
  private readonly octokit: OctokitClient
  private context = context

  // Services
  private readonly issueService: IssueService
  private readonly commentService: CommentService

  constructor() {
    this.config = getConfig()
    this.octokit = createOctokitClient(this.config.githubToken)

    // Initialize services
    const repoContext: RepoContext = {
      owner: this.context.repo.owner,
      repo: this.context.repo.repo,
    }
    this.issueService = new IssueService(this.octokit, repoContext)
    this.commentService = new CommentService(this.octokit, repoContext)
  }

  async handle_unassignments() {
    // Get all assigned issues with their activity status in a single query
    const { unassignIssues, reminderIssues } = await this._get_assigned_issues()

    let processedUnassignments: ExtendedIssue[] = []
    let processedReminders: ExtendedIssue[] = []

    // Process unassignment for stale issues
    if (unassignIssues.length > 0) {
      processedUnassignments = await this._process_unassignments(unassignIssues)
    }

    // Process reminders if enabled
    if (!this.config.enableReminder) {
      // Generate summary even if reminders are disabled
      await this._generate_summary(processedUnassignments, processedReminders)
      return
    }

    if (reminderIssues.length > 0) {
      processedReminders = await this._process_reminders(reminderIssues)
    }

    // Generate the markdown summary
    await this._generate_summary(processedUnassignments, processedReminders)
  }

  private async _get_assigned_issues() {
    const { owner, repo } = this.context.repo
    const {
      daysUntilUnassign,
      reminderDays: configReminderDays,
      assignedLabel,
      pinLabel,
    } = this.config

    let reminderDays: number
    if (configReminderDays === 'auto') {
      reminderDays = Math.floor(daysUntilUnassign / 2)
    } else {
      reminderDays = configReminderDays
    }

    // Fetch all open assigned issues, we'll filter in-memory to prioritize unassignment over reminders
    const {
      data: { items: issues },
    } = await this.octokit.request('GET /search/issues', {
      q: `repo:${owner}/${repo} is:issue is:open label:"${assignedLabel}" -label:"${pinLabel}" assignee:*`,
      per_page: 100,
      advanced_search: true,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    const unassignIssues = []
    const reminderIssues = []

    // Process in chunks of 10 to avoid rate limits
    const chunks = chunkArray(issues, 10)

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const results = chunk.map((issue) => ({
        issue,
        lastActivityDate: new Date(issue.updated_at),
        daysSinceActivity: getDaysBetween(
          new Date(issue.updated_at),
          new Date(),
        ),
      }))

      for (const result of results.filter(Boolean)) {
        const hasReminderLabel = result.issue?.labels?.some(
          (label) => label?.name === '🔔 reminder-sent',
        )

        let shouldUnassign = result.daysSinceActivity >= daysUntilUnassign
        if (hasReminderLabel) {
          shouldUnassign =
            shouldUnassign ||
            // The last day of activity is (normally) the point in time where the reminder label was sent.
            // Thus, reminderDays already passed of the number of daysUntilUnassign.
            // Therefore, we substract reminderDays from daysUntilUnassign to know the "real" period to wait for.
            result.daysSinceActivity >= daysUntilUnassign - reminderDays
        }
        if (shouldUnassign) {
          unassignIssues.push({ ...result, hasReminderLabel })
          continue
        }

        if (result.daysSinceActivity >= reminderDays) {
          if (!hasReminderLabel) {
            reminderIssues.push({ ...result, hasReminderLabel })
          }
        }
      }
    }

    core.info(`📋 Found ${unassignIssues.length} issues to unassign`)
    core.info(`🔔 Found ${reminderIssues.length} issues to send reminders for`)

    return { unassignIssues, reminderIssues }
  }

  private async _process_unassignments(arr: ExtendedIssue[]) {
    const processedResults: ExtendedIssue[] = []
    const unassignedIssueNumbers = []

    // Process in chunks of 5
    const chunks = chunkArray(arr, 5)

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]

      // Process chunk in parallel
      const results = await Promise.allSettled(
        chunk.map(async ({ issue, ...rest }) => {
          try {
            await this._unassign_issue(issue)
            return { issue, ...rest }
          } catch (_err) {
            return { issue, ...rest }
          }
        }),
      )

      processedResults.push(
        ...results.filter((r) => r.status === 'fulfilled').map((r) => r.value),
      )

      // Add successful unassignments to the numbers list for output
      unassignedIssueNumbers.push(
        ...results
          .filter((r) => r.status === 'fulfilled')
          .map((r) => r.value.issue.number),
      )

      // Add delay between chunks
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    core.setOutput('unassigned_issues', unassignedIssueNumbers)
    return processedResults
  }

  private async _process_reminders(arr: ExtendedIssue[]) {
    const processedResults: ExtendedIssue[] = []

    // Process in chunks of 5
    const chunks = chunkArray(arr, 5)

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      // Process chunk in parallel
      const results = await Promise.allSettled(
        chunk.map(async ({ issue, daysSinceActivity, ...rest }) => {
          try {
            await this._send_reminder_for_issue(issue, daysSinceActivity)
            return { issue, daysSinceActivity, ...rest }
          } catch (_err) {
            return { issue, daysSinceActivity, ...rest }
          }
        }),
      )

      processedResults.push(
        ...results.filter((r) => r.status === 'fulfilled').map((r) => r.value),
      )
    }

    return processedResults
  }

  private async _unassign_issue(issue: Issue) {
    if (!issue.assignee) {
      // well, this should never happen anyway :)
      core.warning(`⚠️ Issue #${issue.number} has no assignee, skipping...`)
      return
    }

    const { unassignedComment, pinLabel, assignedLabel } = this.config

    const body = this.commentService.renderTemplate(unassignedComment, {
      handle: issue.assignee.login,
      pin_label: pinLabel,
    })

    // Unassign and remove labels in parallel, then post comment
    await this.issueService.unassignWithLabels(
      issue.number,
      issue.assignee.login,
      [assignedLabel, pinLabel, '🔔 reminder-sent'],
    )

    await this.commentService.createComment(issue.number, body)
  }

  private async _send_reminder_for_issue(
    issue: Issue,
    daysSinceActivity: number,
  ) {
    const { daysUntilUnassign, reminderComment, pinLabel } = this.config
    const daysRemaining = Math.max(0, daysUntilUnassign - daysSinceActivity)

    const body = this.commentService.renderTemplate(reminderComment, {
      handle: issue.assignee?.login,
      days_remaining: daysRemaining,
      pin_label: pinLabel,
    })

    await Promise.all([
      this.issueService.addLabel(issue.number, '🔔 reminder-sent'),
      this.commentService.createComment(issue.number, body),
    ])
  }

  private async _generate_summary(
    processedUnassignments: ExtendedIssue[],
    processedReminders: ExtendedIssue[],
  ) {
    if (
      processedUnassignments.length === 0 &&
      processedReminders.length === 0
    ) {
      core.info('✅ No issues to summarize.')
      return
    }

    const unassignedTable = processedUnassignments.map(
      ({ issue, daysSinceActivity }) => ({
        Issue: `[#${issue.number}](https://github.com/${this.context.repo.owner}/${this.context.repo.repo}/issues/${issue.number})`,
        Assignee: issue.assignee?.login
          ? `[@${issue.assignee.login}](https://github.com/${issue.assignee.login})`
          : 'Unassigned',
        'Days Since Activity': `${daysSinceActivity || 'N/A'}`,
        Status: 'Unassigned',
      }),
    )

    const reminderTable = processedReminders.map(
      ({ issue, daysSinceActivity }) => ({
        Issue: `[#${issue.number}](https://github.com/${this.context.repo.owner}/${this.context.repo.repo}/issues/${issue.number})`,
        Assignee: issue.assignee?.login
          ? `[@${issue.assignee.login}](https://github.com/${issue.assignee.login})`
          : 'Unassigned',
        'Days Since Activity': `${daysSinceActivity || 'N/A'}`,
        Status: 'Reminder Sent',
      }),
    )

    const summary = [
      '## 📋 Summary of Processed Issues',
      '',
      `**Total Issues Processed:** ${processedUnassignments.length + processedReminders.length}`,
      `**Unassigned:** ${processedUnassignments.length} | **Reminders Sent:** ${processedReminders.length}`,
      '',
      '### Unassigned Issues',
      '',
      unassignedTable.length > 0
        ? `| Issue | Assignee | Days Since Activity | Status |` +
          `\n` +
          `|-------|----------|--------------------|--------|` +
          `\n${unassignedTable
            .map(
              (row) =>
                `| ${row.Issue} | ${row.Assignee} | ${row['Days Since Activity']} | ${row.Status} |`,
            )
            .join('\n')}`
        : 'No unassigned issues found.',
      '',
      '### Reminder Sent Issues',
      '',
      reminderTable.length > 0
        ? `| Issue | Assignee | Days Since Activity | Status |` +
          `\n` +
          `|-------|----------|--------------------|--------|` +
          `\n${reminderTable
            .map(
              (row) =>
                `| ${row.Issue} | ${row.Assignee} | ${row['Days Since Activity']} | ${row.Status} |`,
            )
            .join('\n')}`
        : 'No reminder sent issues found.',
      '',
    ]

    core.summary.addRaw(summary.join('\n'))
    await core.summary.write()
  }
}
