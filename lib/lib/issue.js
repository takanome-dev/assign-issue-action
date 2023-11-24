"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
class IssueHandler {
    constructor() {
        this.assignmentDuration = Number((0, core_1.getInput)('days_until_unassign'));
        this.token = (0, core_1.getInput)('github_token', { required: true });
        this.client = (0, github_1.getOctokit)(this.token);
        this.assignedLabel = (0, core_1.getInput)('assigned_label');
        this.exemptLabel = (0, core_1.getInput)('pin_label');
    }
    getIssues() {
        return __awaiter(this, void 0, void 0, function* () {
            const { owner, repo } = github_1.context.repo;
            const timestamp = this.since(this.assignmentDuration);
            const q = [
                // Only get issues with the label that shows they've been assigned
                `label:"${this.assignedLabel}"`,
                // Don't include include pinned issues
                `-label:"${this.exemptLabel}"`,
                // Only include issues, not PRs
                'is:issue',
                // Only search within this repository
                `repo:${owner}/${repo}`,
                // Only find issues/PRs with an assignee.
                'assigned:*',
                // Only find opened issues/PRs
                'is:open',
                // Updated within the last 7 days (or whatever the user has set)
                `updated:<${timestamp}`,
            ];
            const issues = yield this.client.rest.search.issuesAndPullRequests({
                q: q.join(' '),
                sort: 'updated',
                order: 'desc',
                per_page: 100,
            });
            return issues.data.items;
        });
    }
    unassignIssue(issue) {
        return __awaiter(this, void 0, void 0, function* () {
            return Promise.all([
                yield this.client.rest.issues.removeAssignees(Object.assign(Object.assign({}, github_1.context.repo), { issue_number: issue === null || issue === void 0 ? void 0 : issue.number, assignees: [issue === null || issue === void 0 ? void 0 : issue.assignee.login] })),
                yield this.client.rest.issues.removeLabel(Object.assign(Object.assign({}, github_1.context.repo), { issue_number: issue === null || issue === void 0 ? void 0 : issue.number, name: this.assignedLabel })),
            ]);
        });
    }
    since(days) {
        const totalDaysInMilliseconds = days * 24 * 60 * 60 * 1000;
        const date = new Date(+new Date() - totalDaysInMilliseconds);
        return new Date(date).toISOString().substring(0, 10);
    }
}
exports.default = IssueHandler;
