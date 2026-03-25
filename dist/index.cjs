//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") {
		for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) {
				__defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
		}
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let _actions_core = require("@actions/core");
_actions_core = __toESM(_actions_core);
let _actions_github = require("@actions/github");
let date_fns = require("date-fns");
let _octokit_core = require("@octokit/core");
let _octokit_plugin_throttling = require("@octokit/plugin-throttling");
let mustache = require("mustache");
mustache = __toESM(mustache);

//#region commands/assign-user.command.ts
var AssignUserCommand = class {
	constructor(parsedCommand) {
		this.parsedCommand = parsedCommand;
	}
	async execute(context, services) {
		const { issue, config } = context;
		const { issueService, commentService, newcomerChecker, statsService } = services;
		const targetUsername = this.parsedCommand.targetUsername;
		_actions_core.info(`Starting issue assignment to user`);
		if (!targetUsername) {
			_actions_core.info(`No valid user handle found after /assign command`);
			_actions_core.setOutput("assigned", "no");
			return {
				success: false,
				message: "No target username provided"
			};
		}
		_actions_core.info(`🤖 Assigning @${targetUsername} to issue #${issue?.number}`);
		const isNewcomer = await newcomerChecker.isNewcomer(targetUsername);
		const commentTemplate = isNewcomer ? config.assignedNewcomerText : config.assignedText;
		_actions_core.info(`🤖 User @${targetUsername} is ${isNewcomer ? "a newcomer" : "a returning contributor"}`);
		const stats = await statsService.getContributorStats(targetUsername);
		_actions_core.info(`🤖 @${targetUsername} has ${stats.prs_total} PRs (${stats.prs_merged} merged, ${stats.prs_merged_percentage}%)`);
		await Promise.all([issueService.assignWithLabel(Number(issue?.number), targetUsername.trim(), config.assignedLabel), commentService.createTemplatedComment(Number(issue?.number), commentTemplate, {
			total_days: config.daysUntilUnassign,
			unassigned_date: (0, date_fns.format)((0, date_fns.add)(/* @__PURE__ */ new Date(), { days: config.daysUntilUnassign }), "dd LLLL y"),
			handle: targetUsername,
			pin_label: config.pinLabel,
			prs_total: stats.prs_total,
			prs_merged: stats.prs_merged,
			prs_unmerged: stats.prs_unmerged,
			prs_merged_percentage: stats.prs_merged_percentage
		})]);
		_actions_core.info(`🤖 Issue #${issue?.number} assigned!`);
		_actions_core.setOutput("assigned", "yes");
		return {
			success: true,
			message: `Assigned @${targetUsername} to issue #${issue?.number}`
		};
	}
};

//#endregion
//#region commands/auto-suggest.command.ts
var AutoSuggestCommand = class {
	async execute(context, services) {
		const { issue, comment, config } = context;
		const { commentService, validator } = services;
		const username = comment?.user?.login;
		_actions_core.info(`🤖 Comment indicates interest in contribution`);
		if (validator.isAlreadyAssigned({
			number: Number(issue?.number),
			assignee: issue?.assignee,
			assignees: issue?.assignees
		})) {
			const template = validator.isIssuePinned({
				labels: issue?.labels,
				number: Number(issue?.number)
			}) ? config.alreadyAssignedPinnedText : config.alreadyAssignedText;
			await commentService.createTemplatedComment(Number(issue?.number), template, {
				total_days: String(config.daysUntilUnassign),
				handle: username,
				assignee: issue?.assignee?.login
			});
			_actions_core.setOutput("assigned", "no");
			_actions_core.info(`🤖 Issue #${issue?.number} is already assigned to @${issue?.assignee?.login}`);
			return {
				success: false,
				message: `Issue is already assigned to @${issue?.assignee?.login}`
			};
		}
		await commentService.createTemplatedComment(Number(issue?.number), config.assignmentSuggestionText, {
			handle: username,
			trigger: config.selfAssignCmd
		});
		return {
			success: true,
			message: `Suggested @${username} to use ${config.selfAssignCmd}`
		};
	}
};

//#endregion
//#region commands/types.ts
let CommandType = /* @__PURE__ */ function(CommandType) {
	CommandType["SELF_ASSIGN"] = "self_assign";
	CommandType["SELF_UNASSIGN"] = "self_unassign";
	CommandType["ASSIGN_USER"] = "assign_user";
	CommandType["UNASSIGN_USER"] = "unassign_user";
	CommandType["AUTO_SUGGEST"] = "auto_suggest";
	return CommandType;
}({});

//#endregion
//#region commands/command-parser.ts
const CONTRIBUTION_PHRASES = [
	"asssign-me",
	"Assign this issue to me",
	"Assign it to me",
	"Assign to me",
	"Assign me",
	"Assign me this issue",
	"Assign this for me",
	"Available to work on",
	"Can I be assigned to this issue",
	"can I kindly work on this issue",
	"Can I take on this issue",
	"Can I take this issue",
	"Can I take up this issue",
	"Can I work on it",
	"Could I get assigned",
	"I'd like to be assigned to",
	"I'm keen to have a go",
	"I am here to do a university assignment",
	"I am interested in taking on this issue",
	"I am interested in the issue",
	"I am very interested in this issue",
	"I hope to contribute to this issue",
	"I would like to work on this issue",
	"Interested to work",
	"is this free to take",
	"May I do this feature",
	"May I take it",
	"May I work on this issue",
	"Please assign",
	"Still open for contribution",
	"Want to take this issue",
	"Want to contribute",
	"Would be happy to pick this up",
	"Would like to work on this",
	"Would like to contribute",
	"Would love to work on this issue"
];
var CommandParser = class {
	constructor(config) {
		this.config = config;
	}
	/**
	* Parse a comment body into a command
	*/
	parse(rawBody, commenterLogin) {
		const body = rawBody.replace(/^\\/, "/").toLowerCase();
		if (body.trim().startsWith(">")) return null;
		if (this.config.maintainers.includes(commenterLogin) && (body.includes(this.config.selfAssignCmd) || body.includes(this.config.selfUnassignCmd))) return null;
		const { selfAssignCmd, selfUnassignCmd, assignUserCmd, unassignUserCmd, enableAutoSuggestion } = this.config;
		if (enableAutoSuggestion && CONTRIBUTION_PHRASES.some((phrase) => body.toLowerCase().includes(phrase.toLowerCase()))) return { type: CommandType.AUTO_SUGGEST };
		if (body === selfAssignCmd || body.includes(selfAssignCmd)) return { type: CommandType.SELF_ASSIGN };
		if (body === selfUnassignCmd || body.includes(selfUnassignCmd)) return { type: CommandType.SELF_UNASSIGN };
		if (body.includes(assignUserCmd)) {
			const targetUsername = this.extractUsername(rawBody, assignUserCmd);
			return {
				type: CommandType.ASSIGN_USER,
				targetUsername
			};
		}
		if (body.includes(unassignUserCmd)) {
			const targetUsername = this.extractUsername(rawBody, unassignUserCmd);
			return {
				type: CommandType.UNASSIGN_USER,
				targetUsername
			};
		}
		return null;
	}
	/**
	* Check if a command is maintainer-only
	*/
	isMaintainerCommand(command) {
		return command.type === CommandType.ASSIGN_USER || command.type === CommandType.UNASSIGN_USER;
	}
	/**
	* Extract @username from the text after a command
	*/
	extractUsername(rawBody, command) {
		const idx = rawBody.toLowerCase().indexOf(command.toLowerCase());
		if (idx === -1) return void 0;
		return rawBody.slice(idx + command.length).trim().match(/@([a-zA-Z0-9-]{1,39})/i)?.[1];
	}
};

//#endregion
//#region commands/self-assign.command.ts
var SelfAssignCommand = class {
	async execute(context, services) {
		const { issue, comment, config } = context;
		const { issueService, commentService, validator, newcomerChecker, statsService } = services;
		const username = comment?.user?.login;
		_actions_core.info(`🤖 Starting assignment for issue #${issue?.number} in repo "${context.repoOwner}/${context.repoName}"`);
		const validation = await validator.validateAssignment({
			number: Number(issue?.number),
			state: issue?.state,
			assignee: issue?.assignee,
			assignees: issue?.assignees,
			user: issue?.user,
			labels: issue?.labels
		}, username);
		if (!validation.valid) {
			if (validation.reason?.includes("is closed")) await commentService.createTemplatedComment(Number(issue?.number), config.closedIssueAssignmentText, { handle: username });
			else if (validation.reason?.includes("ignored users list")) await commentService.createTemplatedComment(Number(issue?.number), config.ignoredText, { handle: username });
			else if (validation.reason?.includes("cannot self-assign their own issue")) await commentService.createTemplatedComment(Number(issue?.number), config.selfAssignAuthorBlockedText, { handle: username });
			else if (validation.reason?.includes("already assigned")) {
				const currentAssignee = issue?.assignee?.login;
				if (currentAssignee === username) {
					_actions_core.info(`🤖 User @${username} is already assigned to issue #${issue?.number}, staying silent`);
					_actions_core.setOutput("assigned", "no");
					return {
						success: true,
						message: `User @${username} is already assigned to issue #${issue?.number}`
					};
				}
				const template = validator.isIssuePinned({
					labels: issue?.labels,
					number: Number(issue?.number)
				}) ? config.alreadyAssignedPinnedText : config.alreadyAssignedText;
				if (!await this._hasRecentAlreadyAssignedComment(issueService, Number(issue?.number), username, template)) {
					const lastActivity = issue?.updated_at ? new Date(issue.updated_at) : /* @__PURE__ */ new Date();
					const daysSinceActivity = (0, date_fns.differenceInDays)(/* @__PURE__ */ new Date(), lastActivity);
					const daysRemaining = Math.max(0, config.daysUntilUnassign - daysSinceActivity);
					await commentService.createTemplatedComment(Number(issue?.number), template, {
						total_days: String(config.daysUntilUnassign),
						days_remaining: daysRemaining,
						handle: username,
						assignee: currentAssignee
					});
				} else _actions_core.info(`🤖 Skipping "already assigned" comment - already posted recently for issue #${issue?.number}`);
			} else if (validation.reason?.includes("was previously unassigned")) await commentService.createTemplatedComment(Number(issue?.number), config.blockAssignmentText, { handle: username });
			else if (validation.reason?.includes("maximum number of assignments")) await commentService.createTemplatedComment(Number(issue?.number), config.maxAssignmentsText, {
				handle: username,
				max_assignments: config.maxAssignments.toString()
			});
			else if (validation.reason?.includes("assignment limit for label")) {
				const label = validation.reason.match(/label "([^"]+)"/)?.[1] ?? "";
				await commentService.createTemplatedComment(Number(issue?.number), config.maxOverallAssignmentText, {
					handle: username,
					max_overall_assignment_count: config.maxOverallAssignmentCount.toString(),
					label
				});
			}
			_actions_core.setOutput("assigned", "no");
			_actions_core.info(`🤖 ${validation.reason}`);
			return {
				success: false,
				message: validation.reason
			};
		}
		_actions_core.info(`🤖 Assigning @${username} to issue #${issue?.number}`);
		const isNewcomer = await newcomerChecker.isNewcomer(username);
		const commentTemplate = isNewcomer ? config.assignedNewcomerText : config.assignedText;
		_actions_core.info(`🤖 User @${username} is ${isNewcomer ? "a newcomer" : "a returning contributor"}`);
		const stats = await statsService.getContributorStats(username);
		_actions_core.info(`🤖 @${username} has ${stats.prs_total} PRs (${stats.prs_merged} merged, ${stats.prs_merged_percentage}%)`);
		await Promise.all([issueService.assignWithLabel(Number(issue?.number), username, config.assignedLabel), commentService.createTemplatedComment(Number(issue?.number), commentTemplate, {
			total_days: config.daysUntilUnassign,
			unassigned_date: (0, date_fns.format)((0, date_fns.add)(/* @__PURE__ */ new Date(), { days: config.daysUntilUnassign }), "dd LLLL y"),
			handle: username,
			pin_label: config.pinLabel,
			prs_total: stats.prs_total,
			prs_merged: stats.prs_merged,
			prs_unmerged: stats.prs_unmerged,
			prs_merged_percentage: stats.prs_merged_percentage,
			prs: stats.prs
		})]);
		_actions_core.info(`🤖 Issue #${issue?.number} assigned!`);
		_actions_core.setOutput("assigned", "yes");
		return {
			success: true,
			message: `Assigned @${username} to issue #${issue?.number}`
		};
	}
	/**
	* Check if we already posted an "already assigned" comment recently
	* to avoid repetitive comments when users keep trying to assign themselves
	*/
	async _hasRecentAlreadyAssignedComment(issueService, issueNumber, username, template) {
		try {
			const comments = await issueService.getComments(issueNumber);
			const recentThreshold = /* @__PURE__ */ new Date();
			recentThreshold.setDate(recentThreshold.getDate() - 1);
			return comments.some((comment) => {
				const commentDate = comment.body?.includes("already assigned") ? new Date(comment.created_at || Date.now()) : null;
				if (!commentDate) return false;
				const isRecent = commentDate > recentThreshold;
				const mentionsUser = comment.body?.includes(`@${username}`);
				const isAlreadyAssignedComment = comment.body?.includes("already assigned") || template.split("\n")[0].trim().split(" ").slice(0, 3).every((word) => comment.body?.includes(word));
				return isRecent && mentionsUser && isAlreadyAssignedComment;
			});
		} catch {
			return false;
		}
	}
};

//#endregion
//#region commands/self-unassign.command.ts
var SelfUnassignCommand = class {
	async execute(context, services) {
		const { issue, comment, config } = context;
		const { issueService, commentService, validator } = services;
		const commenterLogin = comment?.user?.login;
		const assigneeLogin = issue?.assignee?.login;
		_actions_core.info(`🤖 Starting issue #${issue?.number} unassignment for user @${commenterLogin} in repo "${context.repoOwner}/${context.repoName}"`);
		if (assigneeLogin !== commenterLogin) {
			_actions_core.setOutput("unassigned", "no");
			_actions_core.setOutput("unassigned_issues", []);
			if (assigneeLogin) _actions_core.info(`🤖 Commenter @${commenterLogin} is not the assignee @${assigneeLogin}, staying silent (issue #326)`);
			else _actions_core.info(`🤖 Issue is not assigned to anyone, staying silent (issue #326)`);
			return {
				success: false,
				message: "Issue is not assigned to anyone",
				output: {
					unassigned: "no",
					unassigned_issues: []
				}
			};
		}
		const unassignTemplate = config.selfUnassignedText || config.unassignedText;
		const unassignBody = validator.getUnassignCommentBody(unassignTemplate, {
			handle: commenterLogin,
			pin_label: config.pinLabel
		});
		await Promise.all([issueService.unassignWithLabels(Number(issue?.number), assigneeLogin, [
			config.assignedLabel,
			config.pinLabel,
			"🔔 reminder-sent"
		]), commentService.createComment(Number(issue?.number), unassignBody)]);
		_actions_core.info(`🤖 Done issue unassignment!`);
		_actions_core.setOutput("unassigned", "yes");
		_actions_core.setOutput("unassigned_issues", [issue?.number]);
		return {
			success: true,
			message: `Unassigned @${commenterLogin} from issue #${issue?.number}`,
			output: {
				unassigned: "yes",
				unassigned_issues: [issue?.number]
			}
		};
	}
};

//#endregion
//#region commands/unassign-user.command.ts
var UnassignUserCommand = class {
	constructor(parsedCommand) {
		this.parsedCommand = parsedCommand;
	}
	async execute(context, services) {
		const { issue, config } = context;
		const { issueService } = services;
		const targetUsername = this.parsedCommand.targetUsername;
		_actions_core.info(`Starting issue unassignment to user`);
		if (!targetUsername) {
			_actions_core.setOutput("unassigned", "no");
			_actions_core.setOutput("unassigned_issues", []);
			_actions_core.info(`No valid user handle found after /unassign command`);
			return {
				success: false,
				message: "No target username provided",
				output: {
					unassigned: "no",
					unassigned_issues: []
				}
			};
		}
		if (issue?.assignee?.login !== targetUsername) {
			_actions_core.setOutput("unassigned", "no");
			_actions_core.setOutput("unassigned_issues", []);
			_actions_core.info(`🤖 User @${targetUsername} is not assigned to the issue #${issue?.number}`);
			return {
				success: false,
				message: `User @${targetUsername} is not assigned to the issue`,
				output: {
					unassigned: "no",
					unassigned_issues: []
				}
			};
		}
		await issueService.unassignWithLabels(Number(issue?.number), targetUsername, [
			config.assignedLabel,
			config.pinLabel,
			"🔔 reminder-sent"
		]);
		_actions_core.setOutput("unassigned", "yes");
		_actions_core.setOutput("unassigned_issues", [issue?.number]);
		_actions_core.info(`🤖 User @${targetUsername} is unassigned from the issue #${issue?.number}`);
		return {
			success: true,
			message: `Unassigned @${targetUsername} from issue #${issue?.number}`,
			output: {
				unassigned: "yes",
				unassigned_issues: [issue?.number]
			}
		};
	}
};

//#endregion
//#region utils/lib/inputs.ts
let INPUTS = /* @__PURE__ */ function(INPUTS) {
	INPUTS["SELF_ASSIGN_CMD"] = "self_assign_cmd";
	INPUTS["SELF_UNASSIGN_CMD"] = "self_unassign_cmd";
	INPUTS["ASSIGN_USER_CMD"] = "assign_user_cmd";
	INPUTS["UNASSIGN_USER_CMD"] = "unassign_user_cmd";
	INPUTS["GITHUB_TOKEN"] = "github_token";
	INPUTS["MAINTAINERS"] = "maintainers";
	INPUTS["ENABLE_AUTO_SUGGESTION"] = "enable_auto_suggestion";
	INPUTS["ALLOW_SELF_ASSIGN_AUTHOR"] = "allow_self_assign_author";
	INPUTS["ASSIGNED_LABEL"] = "assigned_label";
	INPUTS["REQUIRED_LABEL"] = "required_label";
	INPUTS["PIN_LABEL"] = "pin_label";
	INPUTS["DAYS_UNTIL_UNASSIGN"] = "days_until_unassign";
	INPUTS["STALE_ASSIGNMENT_LABEL"] = "stale_assignment_label";
	INPUTS["ASSIGNED_TEXT"] = "assigned_text";
	INPUTS["ASSIGNED_NEWCOMER_TEXT"] = "assigned_newcomer_text";
	INPUTS["UNASSIGNED_TEXT"] = "unassigned_text";
	INPUTS["SELF_UNASSIGNED_TEXT"] = "self_unassigned_text";
	INPUTS["ALREADY_ASSIGNED_TEXT"] = "already_assigned_text";
	INPUTS["ALREADY_ASSIGNED_PINNED_TEXT"] = "already_assigned_pinned_text";
	INPUTS["ASSIGNMENT_SUGGESTION_TEXT"] = "assignment_suggestion_text";
	INPUTS["BLOCK_ASSIGNMENT_TEXT"] = "block_assignment_text";
	INPUTS["ENABLE_REMINDER"] = "enable_reminder";
	INPUTS["REMINDER_DAYS"] = "reminder_days";
	INPUTS["REMINDER_TEXT"] = "reminder_text";
	INPUTS["MAX_ASSIGNMENTS"] = "max_assignments";
	INPUTS["MAX_ASSIGNMENTS_TEXT"] = "max_assignments_text";
	INPUTS["MAX_OVERALL_ASSIGNMENT_LABELS"] = "max_overall_assignment_labels";
	INPUTS["MAX_OVERALL_ASSIGNMENT_COUNT"] = "max_overall_assignment_count";
	INPUTS["MAX_OVERALL_ASSIGNMENT_TEXT"] = "max_overall_assignment_text";
	INPUTS["SELF_ASSIGN_AUTHOR_BLOCKED_TEXT"] = "self_assign_author_blocked_text";
	INPUTS["IGNORED_USERS"] = "ignored_users";
	INPUTS["IGNORED_TEXT"] = "ignored_text";
	INPUTS["CLOSED_ISSUE_ASSIGNMENT_TEXT"] = "closed_issue_assignment_text";
	INPUTS["ASSIGNED_COMMENT"] = "assigned_comment";
	INPUTS["ASSIGNED_COMMENT_NEWCOMER"] = "assigned_comment_newcomer";
	INPUTS["UNASSIGNED_COMMENT"] = "unassigned_comment";
	INPUTS["ALREADY_ASSIGNED_COMMENT"] = "already_assigned_comment";
	INPUTS["ALREADY_ASSIGNED_COMMENT_PINNED"] = "already_assigned_comment_pinned";
	INPUTS["ASSIGNMENT_SUGGESTION_COMMENT"] = "assignment_suggestion_comment";
	INPUTS["BLOCK_ASSIGNMENT_COMMENT"] = "block_assignment_comment";
	INPUTS["REMINDER_COMMENT"] = "reminder_comment";
	INPUTS["MAX_ASSIGNMENTS_MESSAGE"] = "max_assignments_message";
	INPUTS["MAX_OVERALL_ASSIGNMENT_MESSAGE"] = "max_overall_assignment_message";
	INPUTS["SELF_ASSIGN_AUTHOR_BLOCKED_COMMENT"] = "self_assign_author_blocked_comment";
	INPUTS["IGNORED_MESSAGE"] = "ignored_message";
	INPUTS["CLOSED_ISSUE_ASSIGNMENT_COMMENT"] = "closed_issue_assignment_comment";
	return INPUTS;
}({});

//#endregion
//#region core/config.ts
let cachedConfig = null;
function getConfig() {
	if (cachedConfig) return cachedConfig;
	cachedConfig = loadConfig();
	return cachedConfig;
}
/**
* Helper function to get input with backward compatibility for deprecated names
* Checks new name first, then falls back to deprecated name with a warning
*/
function getInputWithDeprecation(newName, deprecatedName) {
	const newValue = _actions_core.getInput(newName);
	const deprecatedValue = _actions_core.getInput(deprecatedName);
	if (deprecatedValue && !newValue) {
		_actions_core.warning(`⚠️ The input '${deprecatedName}' is deprecated and will be removed in a future version. Please use '${newName}' instead.`);
		return deprecatedValue;
	}
	return newValue;
}
function loadConfig() {
	const githubToken = _actions_core.getInput(INPUTS.GITHUB_TOKEN);
	if (!githubToken) throw new Error("Missing required input: github_token");
	const maintainersInput = _actions_core.getInput(INPUTS.MAINTAINERS);
	const maxOverallLabelsInput = _actions_core.getInput(INPUTS.MAX_OVERALL_ASSIGNMENT_LABELS);
	const reminderDaysInput = _actions_core.getInput(INPUTS.REMINDER_DAYS);
	let reminderDays = "auto";
	if (reminderDaysInput !== "auto") {
		const parsed = Number.parseInt(reminderDaysInput, 10);
		reminderDays = Number.isNaN(parsed) ? "auto" : parsed;
	}
	return {
		githubToken,
		selfAssignCmd: _actions_core.getInput(INPUTS.SELF_ASSIGN_CMD),
		selfUnassignCmd: _actions_core.getInput(INPUTS.SELF_UNASSIGN_CMD),
		assignUserCmd: _actions_core.getInput(INPUTS.ASSIGN_USER_CMD),
		unassignUserCmd: _actions_core.getInput(INPUTS.UNASSIGN_USER_CMD),
		assignedLabel: _actions_core.getInput(INPUTS.ASSIGNED_LABEL),
		requiredLabel: _actions_core.getInput(INPUTS.REQUIRED_LABEL),
		pinLabel: _actions_core.getInput(INPUTS.PIN_LABEL),
		staleAssignmentLabel: _actions_core.getInput(INPUTS.STALE_ASSIGNMENT_LABEL),
		daysUntilUnassign: Number(_actions_core.getInput(INPUTS.DAYS_UNTIL_UNASSIGN)) || 14,
		maintainers: maintainersInput ? maintainersInput.split(",").map((m) => m.trim()).filter(Boolean) : [],
		enableAutoSuggestion: _actions_core.getBooleanInput(INPUTS.ENABLE_AUTO_SUGGESTION),
		allowSelfAssignAuthor: _actions_core.getInput(INPUTS.ALLOW_SELF_ASSIGN_AUTHOR) !== "false",
		blockAssignment: _actions_core.getInput("block_assignment") === "true",
		maxAssignments: Number.parseInt(_actions_core.getInput(INPUTS.MAX_ASSIGNMENTS) || "3", 10),
		maxOverallAssignmentLabels: maxOverallLabelsInput ? maxOverallLabelsInput.split(",").map((l) => l.trim()).filter(Boolean) : [],
		maxOverallAssignmentCount: Number.parseInt(_actions_core.getInput(INPUTS.MAX_OVERALL_ASSIGNMENT_COUNT) || "0", 10),
		enableReminder: _actions_core.getInput(INPUTS.ENABLE_REMINDER) === "true",
		reminderDays,
		assignedText: getInputWithDeprecation(INPUTS.ASSIGNED_TEXT, INPUTS.ASSIGNED_COMMENT),
		assignedNewcomerText: getInputWithDeprecation(INPUTS.ASSIGNED_NEWCOMER_TEXT, INPUTS.ASSIGNED_COMMENT_NEWCOMER),
		unassignedText: getInputWithDeprecation(INPUTS.UNASSIGNED_TEXT, INPUTS.UNASSIGNED_COMMENT),
		selfUnassignedText: getInputWithDeprecation(INPUTS.SELF_UNASSIGNED_TEXT, INPUTS.UNASSIGNED_COMMENT) || getInputWithDeprecation(INPUTS.UNASSIGNED_TEXT, INPUTS.UNASSIGNED_COMMENT),
		alreadyAssignedText: getInputWithDeprecation(INPUTS.ALREADY_ASSIGNED_TEXT, INPUTS.ALREADY_ASSIGNED_COMMENT),
		alreadyAssignedPinnedText: getInputWithDeprecation(INPUTS.ALREADY_ASSIGNED_PINNED_TEXT, INPUTS.ALREADY_ASSIGNED_COMMENT_PINNED),
		assignmentSuggestionText: getInputWithDeprecation(INPUTS.ASSIGNMENT_SUGGESTION_TEXT, INPUTS.ASSIGNMENT_SUGGESTION_COMMENT),
		blockAssignmentText: getInputWithDeprecation(INPUTS.BLOCK_ASSIGNMENT_TEXT, INPUTS.BLOCK_ASSIGNMENT_COMMENT),
		reminderText: getInputWithDeprecation(INPUTS.REMINDER_TEXT, INPUTS.REMINDER_COMMENT),
		maxAssignmentsText: getInputWithDeprecation(INPUTS.MAX_ASSIGNMENTS_TEXT, INPUTS.MAX_ASSIGNMENTS_MESSAGE),
		maxOverallAssignmentText: getInputWithDeprecation(INPUTS.MAX_OVERALL_ASSIGNMENT_TEXT, INPUTS.MAX_OVERALL_ASSIGNMENT_MESSAGE),
		selfAssignAuthorBlockedText: getInputWithDeprecation(INPUTS.SELF_ASSIGN_AUTHOR_BLOCKED_TEXT, INPUTS.SELF_ASSIGN_AUTHOR_BLOCKED_COMMENT),
		ignoredUsers: _actions_core.getInput(INPUTS.IGNORED_USERS) ? _actions_core.getInput(INPUTS.IGNORED_USERS).split(",").map((u) => u.trim()).filter(Boolean) : [],
		ignoredText: getInputWithDeprecation(INPUTS.IGNORED_TEXT, INPUTS.IGNORED_MESSAGE),
		closedIssueAssignmentText: getInputWithDeprecation(INPUTS.CLOSED_ISSUE_ASSIGNMENT_TEXT, INPUTS.CLOSED_ISSUE_ASSIGNMENT_COMMENT)
	};
}

//#endregion
//#region core/octokit-client.ts
const ThrottledOctokit = _octokit_core.Octokit.plugin(_octokit_plugin_throttling.throttling);
function createOctokitClient(token) {
	return new ThrottledOctokit({
		auth: token,
		throttle: {
			onRateLimit: (retryAfter, options, _octokit, retryCount) => {
				_actions_core.warning(`Request quota exhausted for request ${options.method} ${options.url}`);
				if (retryCount < 1) {
					_actions_core.warning(`Retrying after ${retryAfter} seconds!`);
					return true;
				}
				return false;
			},
			onSecondaryRateLimit: (retryAfter, options, _octokit, retryCount) => {
				_actions_core.warning(`SecondaryRateLimit detected for request ${options.method} ${options.url}`);
				if (retryCount < 2) {
					_actions_core.warning(`Secondary rate limit hit. Retrying after ${retryAfter} seconds!`);
					return true;
				}
				return false;
			}
		}
	});
}

//#endregion
//#region services/assignment/assignment-validator.ts
var AssignmentValidator = class {
	constructor(issueService, config) {
		this.issueService = issueService;
		this.config = config;
	}
	/**
	* Check if an issue is already assigned
	*/
	isAlreadyAssigned(issue) {
		return !!(issue.assignee || (issue.assignees?.length ?? 0) > 0);
	}
	/**
	* Check if the issue has a pin label (exempt from unassignment)
	*/
	isIssuePinned(issue) {
		const { pinLabel } = this.config;
		return issue.labels?.some((label) => {
			return (typeof label === "string" ? label : label.name) === pinLabel;
		}) ?? false;
	}
	/**
	* Check if issue has the required label (if configured)
	*/
	hasRequiredLabel(issue) {
		const { requiredLabel } = this.config;
		if (!requiredLabel) return { valid: true };
		const hasLabel = issue.labels?.some((label) => {
			return (typeof label === "string" ? label : label.name) === requiredLabel;
		});
		return {
			valid: !!hasLabel,
			reason: hasLabel ? void 0 : `Missing required label: "${requiredLabel}" not found in issue #${issue.number}`
		};
	}
	/**
	* Check if a user can self-assign their own issue
	*/
	canSelfAssignOwnIssue(issue, commenterLogin) {
		const { allowSelfAssignAuthor } = this.config;
		if (allowSelfAssignAuthor) return { valid: true };
		const isAuthor = issue.user?.login === commenterLogin;
		return {
			valid: !isAuthor,
			reason: isAuthor ? `User @${commenterLogin} cannot self-assign their own issue #${issue.number}` : void 0
		};
	}
	/**
	* Generate hidden HTML comment marker for unassignment tracking
	* This survives template customizations and is machine-readable
	*/
	getUnassignMarker(username) {
		return `<!-- unassigned:${username} -->`;
	}
	/**
	* Check if user was previously unassigned and is blocked from reassignment
	*/
	async wasBlockedFromReassignment(issueNumber, username) {
		const { blockAssignment, unassignUserCmd, unassignedText } = this.config;
		if (!blockAssignment) return { valid: true };
		const comments = await this.issueService.getComments(issueNumber);
		const marker = this.getUnassignMarker(username);
		const wasUnassigned = comments.some((comment) => {
			const hasMarker = comment.body?.includes(marker);
			const hasManualUnassign = comment.body?.includes(`${unassignUserCmd} @${username}`);
			const hasRenderedComment = comment.body?.includes(mustache.default.render(unassignedText, { handle: username }));
			return hasMarker || hasManualUnassign || hasRenderedComment;
		});
		return {
			valid: !wasUnassigned,
			reason: wasUnassigned ? `User @${username} was previously unassigned from issue #${issueNumber}` : void 0
		};
	}
	/**
	* Get the unassign comment body with hidden marker for tracking
	*/
	getUnassignCommentBody(template, data) {
		const marker = this.getUnassignMarker(data.handle);
		return `${mustache.default.render(template, data)}\n${marker}`;
	}
	/**
	* Check if user has reached max assignment count
	*/
	async hasReachedMaxAssignments(username) {
		const { maxAssignments } = this.config;
		const count = await this.issueService.getAssignmentCount(username);
		return {
			valid: count < maxAssignments,
			reason: count >= maxAssignments ? `User @${username} has reached the maximum number of assignments (${maxAssignments})` : void 0
		};
	}
	/**
	* Check if user has reached per-label assignment limits
	*/
	async hasReachedLabelLimit(username, issueLabels) {
		const { maxOverallAssignmentLabels, maxOverallAssignmentCount } = this.config;
		if (maxOverallAssignmentLabels.length === 0 || maxOverallAssignmentCount <= 0) return { valid: true };
		const matchingLabels = issueLabels.map((l) => typeof l === "string" ? l : l.name ?? "").filter((label) => maxOverallAssignmentLabels.includes(label));
		if (matchingLabels.length === 0) return { valid: true };
		const labelCounts = await this.issueService.getAssignmentCountPerLabel(username, maxOverallAssignmentLabels);
		for (const label of matchingLabels) {
			const count = labelCounts.get(label) ?? 0;
			if (count >= maxOverallAssignmentCount) return {
				valid: false,
				reason: `User @${username} has reached the assignment limit for label "${label}" (${count}/${maxOverallAssignmentCount})`
			};
		}
		return { valid: true };
	}
	/**
	* Check if user is in the ignored users list
	*/
	isUserIgnored(username) {
		const { ignoredUsers } = this.config;
		if (ignoredUsers.length === 0) return { valid: true };
		const isIgnored = ignoredUsers.includes(username);
		return {
			valid: !isIgnored,
			reason: isIgnored ? `User @${username} is in the ignored users list and cannot self-assign issues` : void 0
		};
	}
	/**
	* Check if issue is closed
	*/
	isIssueClosed(issue) {
		const isClosed = issue.state === "closed";
		return {
			valid: !isClosed,
			reason: isClosed ? `Issue #${issue.number} is closed and cannot be assigned` : void 0
		};
	}
	/**
	* Run all pre-assignment validations
	*/
	async validateAssignment(issue, username) {
		const closedCheck = this.isIssueClosed(issue);
		if (!closedCheck.valid) return closedCheck;
		if (this.isAlreadyAssigned(issue)) {
			const assignee = issue.assignee?.login ?? "unknown";
			return {
				valid: false,
				reason: `Issue #${issue.number} is already assigned to @${assignee}`
			};
		}
		const requiredLabelCheck = this.hasRequiredLabel(issue);
		if (!requiredLabelCheck.valid) return requiredLabelCheck;
		const selfAssignCheck = this.canSelfAssignOwnIssue(issue, username);
		if (!selfAssignCheck.valid) return selfAssignCheck;
		const ignoredCheck = this.isUserIgnored(username);
		if (!ignoredCheck.valid) return ignoredCheck;
		const blockedCheck = await this.wasBlockedFromReassignment(issue.number, username);
		if (!blockedCheck.valid) return blockedCheck;
		const maxCheck = await this.hasReachedMaxAssignments(username);
		if (!maxCheck.valid) return maxCheck;
		const labelLimitCheck = await this.hasReachedLabelLimit(username, issue.labels ?? []);
		if (!labelLimitCheck.valid) return labelLimitCheck;
		return { valid: true };
	}
};

//#endregion
//#region services/assignment/newcomer-checker.ts
var NewcomerChecker = class {
	constructor(issueService) {
		this.issueService = issueService;
	}
	/**
	* Check if a user is a newcomer (has never opened a PR in this repo)
	*/
	async isNewcomer(username) {
		try {
			return (await this.issueService.searchIssues(`is:pr author:${username}`)).total_count === 0;
		} catch (error) {
			_actions_core.warning(`Failed to check PR history for @${username}: ${error}`);
			return false;
		}
	}
};

//#endregion
//#region services/github/comment-service.ts
const API_VERSION$2 = "2022-11-28";
var CommentService = class {
	constructor(octokit, repoContext) {
		this.octokit = octokit;
		this.repoContext = repoContext;
	}
	/**
	* Create a comment on an issue with optional mustache templating
	*/
	async createComment(issueNumber, body) {
		await this.octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
			owner: this.repoContext.owner,
			repo: this.repoContext.repo,
			issue_number: issueNumber,
			body,
			headers: { "X-GitHub-Api-Version": API_VERSION$2 }
		});
	}
	/**
	* Create a comment using a mustache template
	*/
	async createTemplatedComment(issueNumber, template, data) {
		const body = mustache.default.render(template, data);
		await this.createComment(issueNumber, body);
	}
	/**
	* Render a mustache template without posting (useful for checking content)
	*/
	renderTemplate(template, data) {
		return mustache.default.render(template, data);
	}
};

//#endregion
//#region services/github/issue-service.ts
const API_VERSION$1 = "2022-11-28";
var IssueService = class {
	constructor(octokit, repoContext) {
		this.octokit = octokit;
		this.repoContext = repoContext;
	}
	async addAssignee(issueNumber, username) {
		await this.octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/assignees", {
			owner: this.repoContext.owner,
			repo: this.repoContext.repo,
			issue_number: issueNumber,
			assignees: [username],
			headers: { "X-GitHub-Api-Version": API_VERSION$1 }
		});
	}
	async removeAssignee(issueNumber, username) {
		await this.octokit.request("DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees", {
			owner: this.repoContext.owner,
			repo: this.repoContext.repo,
			issue_number: issueNumber,
			assignees: [username],
			headers: { "X-GitHub-Api-Version": API_VERSION$1 }
		});
	}
	async addLabel(issueNumber, label) {
		await this.octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/labels", {
			owner: this.repoContext.owner,
			repo: this.repoContext.repo,
			issue_number: issueNumber,
			labels: [label],
			headers: { "X-GitHub-Api-Version": API_VERSION$1 }
		});
	}
	async removeLabel(issueNumber, label) {
		try {
			await this.octokit.request("DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}", {
				owner: this.repoContext.owner,
				repo: this.repoContext.repo,
				issue_number: issueNumber,
				name: label,
				headers: { "X-GitHub-Api-Version": API_VERSION$1 }
			});
		} catch {}
	}
	async getComments(issueNumber) {
		return (await this.octokit.request("GET /repos/{owner}/{repo}/issues/{issue_number}/comments", {
			owner: this.repoContext.owner,
			repo: this.repoContext.repo,
			issue_number: issueNumber,
			headers: { "X-GitHub-Api-Version": API_VERSION$1 }
		})).data;
	}
	async searchIssues(query) {
		const { owner, repo } = this.repoContext;
		const fullQuery = `repo:${owner}/${repo} ${query}`;
		return (await this.octokit.request("GET /search/issues", {
			q: fullQuery,
			advanced_search: "true",
			headers: { "X-GitHub-Api-Version": API_VERSION$1 }
		})).data;
	}
	async getAssignmentCount(username) {
		return (await this.searchIssues(`is:issue is:open assignee:${username}`)).items.length;
	}
	async getAssignmentCountPerLabel(username, labels) {
		const labelCounts = /* @__PURE__ */ new Map();
		if (labels.length === 0) return labelCounts;
		for (const label of labels) {
			const result = await this.searchIssues(`is:issue assignee:${username} label:"${label}"`);
			labelCounts.set(label, result.total_count || 0);
		}
		return labelCounts;
	}
	/**
	* Assign user and add label in parallel
	*/
	async assignWithLabel(issueNumber, username, label) {
		await Promise.all([this.addAssignee(issueNumber, username), this.addLabel(issueNumber, label)]);
	}
	/**
	* Remove assignee and labels in parallel (for unassignment)
	*/
	async unassignWithLabels(issueNumber, username, labelsToRemove) {
		return Promise.allSettled([this.removeAssignee(issueNumber, username), ...labelsToRemove.map((label) => this.removeLabel(issueNumber, label))]);
	}
};

//#endregion
//#region services/github/team-service.ts
var TeamService = class {
	constructor(octokit) {
		this.octokit = octokit;
	}
	/**
	* Get members of a GitHub team
	*/
	async getTeamMembers(org, teamSlug) {
		try {
			return (await this.octokit.request("GET /orgs/{org}/teams/{team_slug}/members", {
				org,
				team_slug: teamSlug
			})).data.map((m) => m.login);
		} catch (error) {
			_actions_core.warning(`Failed to fetch members for team @${org}/${teamSlug}. Ensure the token has read:org permissions. Error: ${error}`);
			return [];
		}
	}
	/**
	* Resolve a list of maintainers that may include team references
	* Team references use format: @org/team-name
	*
	* @param maintainers - Array of usernames or team references
	* @returns Array of resolved usernames
	*/
	async resolveMaintainers(maintainers) {
		const resolvedMaintainers = /* @__PURE__ */ new Set();
		for (const maintainer of maintainers) if (maintainer.startsWith("@") && maintainer.includes("/")) {
			const [org, team] = maintainer.substring(1).split("/");
			const members = await this.getTeamMembers(org, team);
			for (const member of members) resolvedMaintainers.add(member);
		} else resolvedMaintainers.add(maintainer);
		return Array.from(resolvedMaintainers);
	}
	/**
	* Check if a user is in the maintainers list (resolving teams if needed)
	*/
	async isMaintainer(username, maintainers) {
		return (await this.resolveMaintainers(maintainers)).includes(username);
	}
};

//#endregion
//#region services/github/stats-service.ts
const API_VERSION = "2022-11-28";
var StatsService = class {
	constructor(octokit, repoContext) {
		this.octokit = octokit;
		this.repoContext = repoContext;
	}
	async getContributorStats(username) {
		try {
			const allPrs = await this.searchPullRequests(`is:pr author:${username}`);
			const mergedPrs = await this.searchPullRequests(`is:pr author:${username} is:merged`);
			const total = allPrs.total_count;
			const merged = mergedPrs.total_count;
			return {
				prs_total: total,
				prs_merged: merged,
				prs_unmerged: total - merged,
				prs_merged_percentage: total > 0 ? Math.round(merged / total * 100) : 0,
				prs: allPrs.items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5).map((item) => ({
					number: item.number,
					title: item.title,
					url: item.html_url
				}))
			};
		} catch (error) {
			_actions_core.warning(`Failed to fetch PR stats for @${username}: ${error}`);
			return {
				prs_total: 0,
				prs_merged: 0,
				prs_unmerged: 0,
				prs_merged_percentage: 0,
				prs: []
			};
		}
	}
	async searchPullRequests(query) {
		const { owner, repo } = this.repoContext;
		const fullQuery = `repo:${owner}/${repo} ${query}`;
		return (await this.octokit.request("GET /search/issues", {
			q: fullQuery,
			advanced_search: "true",
			headers: { "X-GitHub-Api-Version": API_VERSION }
		})).data;
	}
};

//#endregion
//#region handlers/comment-handler.ts
var CommentHandler = class {
	constructor() {
		this.config = getConfig();
		this.issue = _actions_github.context.payload.issue;
		this.comment = _actions_github.context.payload.comment;
		this.octokit = createOctokitClient(this.config.githubToken);
		const repoContext = {
			owner: _actions_github.context.repo.owner,
			repo: _actions_github.context.repo.repo
		};
		const issueService = new IssueService(this.octokit, repoContext);
		const commentService = new CommentService(this.octokit, repoContext);
		this.teamService = new TeamService(this.octokit);
		this.services = {
			issueService,
			commentService,
			teamService: this.teamService,
			statsService: new StatsService(this.octokit, repoContext),
			validator: new AssignmentValidator(issueService, this.config),
			newcomerChecker: new NewcomerChecker(issueService)
		};
		this.parser = new CommandParser(this.config);
	}
	async handle_issue_comment() {
		_actions_core.info(`🤖 Checking commands in the issue (#${this.issue?.number}) comments"`);
		const { requiredLabel } = this.config;
		if (requiredLabel) {
			if (!this.issue?.labels?.find((label) => label.name === requiredLabel)) return _actions_core.setFailed(`🚫 Missing required label: "${requiredLabel}" not found in issue #${this.issue?.number}.`);
		}
		const rawBody = _actions_github.context.payload.comment?.body;
		const commenterLogin = this.comment?.user?.login;
		const parsedCommand = this.parser.parse(rawBody, commenterLogin);
		if (!parsedCommand) return _actions_core.info(`🤖 Ignoring comment: ${_actions_github.context.payload.comment?.id} because it does not contain a supported command.`);
		if (this.parser.isMaintainerCommand(parsedCommand)) {
			if (this.config.maintainers.length === 0) return _actions_core.info(`🤖 Ignoring maintainer command because the "maintainers" input is empty`);
			if (!(await this.teamService.resolveMaintainers(this.config.maintainers)).includes(commenterLogin)) return _actions_core.info(`🤖 Ignoring maintainer command because user @${commenterLogin} is not in the maintainers list`);
		}
		const command = this.getCommand(parsedCommand);
		if (!command) return _actions_core.info(`🤖 Unknown command type: ${parsedCommand.type}`);
		const commandContext = {
			issue: this.issue,
			comment: this.comment,
			config: this.config,
			repoOwner: _actions_github.context.repo.owner,
			repoName: _actions_github.context.repo.repo
		};
		await command.execute(commandContext, this.services);
	}
	getCommand(parsedCommand) {
		switch (parsedCommand.type) {
			case CommandType.SELF_ASSIGN: return new SelfAssignCommand();
			case CommandType.SELF_UNASSIGN: return new SelfUnassignCommand();
			case CommandType.ASSIGN_USER: return new AssignUserCommand(parsedCommand);
			case CommandType.UNASSIGN_USER: return new UnassignUserCommand(parsedCommand);
			case CommandType.AUTO_SUGGEST: return new AutoSuggestCommand();
			default: return null;
		}
	}
};

//#endregion
//#region utils/helpers/common.ts
/**
* Utility function to split array into chunks
* @param array - The array to split
* @param chunkSize - The size of each chunk
* @returns An array of arrays
*/
function chunkArray(array, chunkSize) {
	const chunks = [];
	for (let i = 0; i < array.length; i += chunkSize) chunks.push(array.slice(i, i + chunkSize));
	return chunks;
}
/**
* Utility function to calculate days between dates
* @param start - The start date
* @param end - The end date
* @returns The number of days between the two dates
*/
function getDaysBetween(start, end) {
	const diffTime = Math.abs(end.getTime() - start.getTime());
	return Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
}

//#endregion
//#region handlers/schedule-handler.ts
var ScheduleHandler = class {
	constructor() {
		this.context = _actions_github.context;
		this.config = getConfig();
		this.octokit = createOctokitClient(this.config.githubToken);
		const repoContext = {
			owner: this.context.repo.owner,
			repo: this.context.repo.repo
		};
		this.issueService = new IssueService(this.octokit, repoContext);
		this.commentService = new CommentService(this.octokit, repoContext);
	}
	async handle_unassignments() {
		await this._cleanup_orphaned_labels();
		const { unassignIssues, reminderIssues } = await this._get_assigned_issues();
		let processedUnassignments = [];
		let processedReminders = [];
		if (unassignIssues.length > 0) processedUnassignments = await this._process_unassignments(unassignIssues);
		if (!this.config.enableReminder) {
			await this._generate_summary(processedUnassignments, processedReminders);
			return;
		}
		if (reminderIssues.length > 0) processedReminders = await this._process_reminders(reminderIssues);
		await this._generate_summary(processedUnassignments, processedReminders);
	}
	/**
	* Find issues with assigned label but no assignee and remove the label
	* This handles cases where users were manually unassigned or deleted their profile
	*/
	async _cleanup_orphaned_labels() {
		const { owner, repo } = this.context.repo;
		const { assignedLabel, pinLabel } = this.config;
		const { data: { items: orphanedIssues } } = await this.octokit.request("GET /search/issues", {
			q: `repo:${owner}/${repo} is:issue is:open label:"${assignedLabel}" -label:"${pinLabel}" no:assignee`,
			per_page: 100,
			advanced_search: "true",
			headers: { "X-GitHub-Api-Version": "2022-11-28" }
		});
		if (orphanedIssues.length === 0) return;
		_actions_core.info(`🧹 Found ${orphanedIssues.length} issues with orphaned assigned labels (no assignee)`);
		const chunks = chunkArray(orphanedIssues, 5);
		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i];
			await Promise.allSettled(chunk.map(async (issue) => {
				try {
					await this.issueService.removeLabel(issue.number, assignedLabel);
					_actions_core.info(`🧹 Removed orphaned assigned label from issue #${issue.number}`);
				} catch (err) {
					_actions_core.warning(`⚠️ Failed to remove label from issue #${issue.number}: ${err}`);
				}
			}));
			if (i < chunks.length - 1) await new Promise((resolve) => setTimeout(resolve, 1e3));
		}
	}
	async _get_assigned_issues() {
		const { owner, repo } = this.context.repo;
		const { daysUntilUnassign, reminderDays: configReminderDays, assignedLabel, pinLabel } = this.config;
		let reminderDays;
		if (configReminderDays === "auto") reminderDays = Math.floor(daysUntilUnassign / 2);
		else reminderDays = configReminderDays;
		const { data: { items: issues } } = await this.octokit.request("GET /search/issues", {
			q: `repo:${owner}/${repo} is:issue is:open label:"${assignedLabel}" -label:"${pinLabel}" assignee:*`,
			per_page: 100,
			advanced_search: "true",
			headers: { "X-GitHub-Api-Version": "2022-11-28" }
		});
		const unassignIssues = [];
		const reminderIssues = [];
		const chunks = chunkArray(issues, 10);
		for (let i = 0; i < chunks.length; i++) {
			const results = chunks[i].map((issue) => ({
				issue,
				lastActivityDate: new Date(issue.updated_at),
				daysSinceActivity: getDaysBetween(new Date(issue.updated_at), /* @__PURE__ */ new Date())
			}));
			for (const result of results.filter(Boolean)) {
				const hasReminderLabel = result.issue?.labels?.some((label) => label?.name === "🔔 reminder-sent");
				if (result.daysSinceActivity >= daysUntilUnassign) {
					unassignIssues.push({
						...result,
						hasReminderLabel
					});
					continue;
				}
				if (result.daysSinceActivity >= reminderDays) {
					if (!hasReminderLabel) reminderIssues.push({
						...result,
						hasReminderLabel
					});
				}
			}
		}
		_actions_core.info(`📋 Found ${unassignIssues.length} issues to unassign`);
		_actions_core.info(`🔔 Found ${reminderIssues.length} issues to send reminders for`);
		return {
			unassignIssues,
			reminderIssues
		};
	}
	async _process_unassignments(arr) {
		const processedResults = [];
		const unassignedIssueNumbers = [];
		const chunks = chunkArray(arr, 5);
		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i];
			const results = await Promise.allSettled(chunk.map(async ({ issue, ...rest }) => {
				try {
					await this._unassign_issue(issue);
					return {
						issue,
						...rest
					};
				} catch (_err) {
					return {
						issue,
						...rest
					};
				}
			}));
			processedResults.push(...results.filter((r) => r.status === "fulfilled").map((r) => r.value));
			unassignedIssueNumbers.push(...results.filter((r) => r.status === "fulfilled").map((r) => r.value.issue.number));
			if (i < chunks.length - 1) await new Promise((resolve) => setTimeout(resolve, 1e3));
		}
		_actions_core.setOutput("unassigned_issues", unassignedIssueNumbers);
		return processedResults;
	}
	async _process_reminders(arr) {
		const processedResults = [];
		const chunks = chunkArray(arr, 5);
		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i];
			const results = await Promise.allSettled(chunk.map(async ({ issue, daysSinceActivity, ...rest }) => {
				try {
					await this._send_reminder_for_issue(issue, daysSinceActivity);
					return {
						issue,
						daysSinceActivity,
						...rest
					};
				} catch (_err) {
					return {
						issue,
						daysSinceActivity,
						...rest
					};
				}
			}));
			processedResults.push(...results.filter((r) => r.status === "fulfilled").map((r) => r.value));
		}
		return processedResults;
	}
	async _unassign_issue(issue) {
		if (!issue.assignee) {
			_actions_core.info(`📋 Issue #${issue.number} already unassigned, skipping...`);
			return;
		}
		const { unassignedText, pinLabel, assignedLabel } = this.config;
		const marker = `<!-- unassigned:${issue.assignee.login} -->`;
		const body = `${this.commentService.renderTemplate(unassignedText, {
			handle: issue.assignee.login,
			pin_label: pinLabel
		})}\n${marker}`;
		await this.issueService.unassignWithLabels(issue.number, issue.assignee.login, [
			assignedLabel,
			pinLabel,
			"🔔 reminder-sent"
		]);
		await this.commentService.createComment(issue.number, body);
	}
	async _send_reminder_for_issue(issue, daysSinceActivity) {
		if (!issue.assignee) {
			_actions_core.info(`🔔 Skipping reminder for issue #${issue.number} - no longer assigned`);
			return;
		}
		const { daysUntilUnassign, reminderText, pinLabel } = this.config;
		const daysRemaining = Math.max(0, daysUntilUnassign - daysSinceActivity);
		const body = this.commentService.renderTemplate(reminderText, {
			handle: issue.assignee.login,
			days_remaining: daysRemaining,
			pin_label: pinLabel
		});
		await Promise.all([this.issueService.addLabel(issue.number, "🔔 reminder-sent"), this.commentService.createComment(issue.number, body)]);
	}
	async _generate_summary(processedUnassignments, processedReminders) {
		if (processedUnassignments.length === 0 && processedReminders.length === 0) {
			_actions_core.info("✅ No issues to summarize.");
			return;
		}
		const unassignedTable = processedUnassignments.map(({ issue, daysSinceActivity }) => ({
			Issue: `[#${issue.number}](https://github.com/${this.context.repo.owner}/${this.context.repo.repo}/issues/${issue.number})`,
			Assignee: issue.assignee?.login ? `[@${issue.assignee.login}](https://github.com/${issue.assignee.login})` : "Unassigned",
			"Days Since Activity": `${daysSinceActivity || "N/A"}`,
			Status: "Unassigned"
		}));
		const reminderTable = processedReminders.map(({ issue, daysSinceActivity }) => ({
			Issue: `[#${issue.number}](https://github.com/${this.context.repo.owner}/${this.context.repo.repo}/issues/${issue.number})`,
			Assignee: issue.assignee?.login ? `[@${issue.assignee.login}](https://github.com/${issue.assignee.login})` : "Unassigned",
			"Days Since Activity": `${daysSinceActivity || "N/A"}`,
			Status: "Reminder Sent"
		}));
		const summary = [
			"## 📋 Summary of Processed Issues",
			"",
			`**Total Issues Processed:** ${processedUnassignments.length + processedReminders.length}`,
			`**Unassigned:** ${processedUnassignments.length} | **Reminders Sent:** ${processedReminders.length}`,
			"",
			"### Unassigned Issues",
			"",
			unassignedTable.length > 0 ? `| Issue | Assignee | Days Since Activity | Status |
|-------|----------|--------------------|--------|\n${unassignedTable.map((row) => `| ${row.Issue} | ${row.Assignee} | ${row["Days Since Activity"]} | ${row.Status} |`).join("\n")}` : "No unassigned issues found.",
			"",
			"### Reminder Sent Issues",
			"",
			reminderTable.length > 0 ? `| Issue | Assignee | Days Since Activity | Status |
|-------|----------|--------------------|--------|\n${reminderTable.map((row) => `| ${row.Issue} | ${row.Assignee} | ${row["Days Since Activity"]} | ${row.Status} |`).join("\n")}` : "No reminder sent issues found.",
			""
		];
		_actions_core.summary.addRaw(summary.join("\n"));
		await _actions_core.summary.write();
	}
};

//#endregion
//#region index.ts
(async () => {
	const event = _actions_github.context.eventName;
	try {
		if (event === "issue_comment") await new CommentHandler().handle_issue_comment();
		else if (event === "workflow_dispatch" || event === "schedule") await new ScheduleHandler().handle_unassignments();
		else return;
	} catch (error) {
		if (error instanceof Error) return _actions_core.setFailed(error.message);
	}
})();

//#endregion