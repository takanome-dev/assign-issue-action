"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
class IssueHandler {
    constructor() {
        this.assignmentDuration = Number(core.getInput('days_until_unassign'));
        this.token = core.getInput('github_token', { required: true });
        this.client = github.getOctokit(this.token);
        this.assignedLabel = core.getInput('assigned_label');
        this.exemptLabel = core.getInput('pin_label');
    }
    getIssues() {
        return __awaiter(this, void 0, void 0, function* () {
            const { owner, repo } = github.context.repo;
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
                yield this.client.rest.issues.removeAssignees(Object.assign(Object.assign({}, github.context.repo), { issue_number: issue === null || issue === void 0 ? void 0 : issue.number, assignees: [issue === null || issue === void 0 ? void 0 : issue.assignee.login] })),
                yield this.client.rest.issues.removeLabel(Object.assign(Object.assign({}, github.context.repo), { issue_number: issue === null || issue === void 0 ? void 0 : issue.number, name: this.assignedLabel })),
            ]);
        });
    }
    since(days) {
        const totalDaysInMiliseconds = days * 24 * 60 * 60 * 1000;
        const date = new Date(+new Date() - totalDaysInMiliseconds);
        return new Date(date).toISOString().substring(0, 10);
    }
}
exports.default = IssueHandler;
