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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mustache_1 = __importDefault(require("mustache"));
const helpers_1 = __importDefault(require("./helpers"));
class Comment {
    constructor(core, github) {
        this.issue = github.context.payload.issue;
        this.comment = github.context.payload.comment;
        this.token = core.getInput('github_token');
        this.core = core;
        this.github = github;
        this.client = this.github.getOctokit(this.token);
    }
    handleAssignIssue() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        return __awaiter(this, void 0, void 0, function* () {
            this.core.info(`🤖 Starting issue assignment...`);
            this.core.info(`🤖 GITHUB_TOKEN: ${this.token}`);
            const trigger = this.core.getInput('trigger');
            const isTriggered = (_b = (_a = this.github.context.payload.comment) === null || _a === void 0 ? void 0 : _a.body) === null || _b === void 0 ? void 0 : _b.includes(trigger);
            if (!isTriggered) {
                return this.core.info(`🤖 Ignoring comment: ${(_c = this.github.context.payload.comment) === null || _c === void 0 ? void 0 : _c.body}`);
            }
            // this.token = this.core.getInput('github_token');
            // this.client = this.github.getOctokit(this.token);
            if (!this.token)
                return this.core.setFailed(`🚫 Missing required input: token = ${this.token}`);
            const requiredLabel = this.core.getInput('required_label');
            if (requiredLabel) {
                // Check if the issue has the required label
                const hasLabel = (_e = (_d = this.issue) === null || _d === void 0 ? void 0 : _d.labels) === null || _e === void 0 ? void 0 : _e.find((label) => label.name === requiredLabel);
                if (!hasLabel)
                    return this.core.setFailed(`🚫 Missing required label: "[${this.core.getInput('required_label')}]" label not found in issue #${(_f = this.issue) === null || _f === void 0 ? void 0 : _f.number}.`);
            }
            const totalDays = Number(this.core.getInput('days_until_unassign'));
            // Check if the issue is already assigned
            if ((_g = this.issue) === null || _g === void 0 ? void 0 : _g.assignee) {
                yield this.issueAssignedComment(totalDays);
                return this.core.info(`🤖 Issue #${(_h = this.issue) === null || _h === void 0 ? void 0 : _h.number} is already assigned to @${(_k = (_j = this.issue) === null || _j === void 0 ? void 0 : _j.assignee) === null || _k === void 0 ? void 0 : _k.login}`);
            }
            this.core.info(`🤖 Assigning @${(_m = (_l = this.comment) === null || _l === void 0 ? void 0 : _l.user) === null || _m === void 0 ? void 0 : _m.login} to issue #${(_o = this.issue) === null || _o === void 0 ? void 0 : _o.number}`);
            // Assign the issue to the user and add label "assigned_label"
            yield this.addAssignee();
            // Add a comment to the issue
            this.core.info(`🤖 Adding comment to issue #${(_p = this.issue) === null || _p === void 0 ? void 0 : _p.number}`);
            const options = {
                totalDays,
                comment: this.comment,
                // eslint-disable-next-line no-undef
                env: process.env,
                inputs: helpers_1.default.getInputs(),
            };
            yield this.createComment('assigned_comment', options);
            this.core.info(`🤖 Issue #${(_q = this.issue) === null || _q === void 0 ? void 0 : _q.number} assigned!`);
        });
    }
    addAssignee() {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                yield this.client.rest.issues.addAssignees(Object.assign(Object.assign({}, this.github.context.repo), { issue_number: (_a = this.issue) === null || _a === void 0 ? void 0 : _a.number, assignees: [(_b = this.comment) === null || _b === void 0 ? void 0 : _b.user.login] })),
                yield this.client.rest.issues.addLabels(Object.assign(Object.assign({}, this.github.context.repo), { issue_number: (_c = this.issue) === null || _c === void 0 ? void 0 : _c.number, labels: [this.core.getInput('assigned_label')] })),
            ]);
        });
    }
    createComment(inputName, options) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const body = mustache_1.default.render(this.core.getInput(inputName), options);
            yield this.client.rest.issues.createComment(Object.assign(Object.assign({}, this.github.context.repo), { issue_number: (_a = this.issue) === null || _a === void 0 ? void 0 : _a.number, body }));
        });
    }
    issueAssignedComment(totalDays) {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function* () {
            const comments = yield this.client.rest.issues.listComments(Object.assign(Object.assign({}, this.github.context.repo), { issue_number: (_a = this.issue) === null || _a === void 0 ? void 0 : _a.number }));
            const assignedComment = comments.data.find((comment) => { var _a, _b; return comment.user.login === ((_b = (_a = this.issue) === null || _a === void 0 ? void 0 : _a.assignee) === null || _b === void 0 ? void 0 : _b.login); });
            if (!assignedComment) {
                return this.core.info(`🤖 Issue #${(_b = this.issue) === null || _b === void 0 ? void 0 : _b.number} is already assigned to @${(_d = (_c = this.issue) === null || _c === void 0 ? void 0 : _c.assignee) === null || _d === void 0 ? void 0 : _d.login}`);
            }
            const daysUntilUnassign = this.calculateDaysUntilUnassign(assignedComment === null || assignedComment === void 0 ? void 0 : assignedComment.created_at, totalDays);
            yield this.createComment('already_assigned_comment', {
                daysUntilUnassign,
                comment: this.comment,
                assignee: (_e = this.issue) === null || _e === void 0 ? void 0 : _e.assignee,
            });
        });
    }
    calculateDaysUntilUnassign(createAt, totalDays) {
        const createdAt = new Date(createAt);
        const currentDate = new Date();
        const diffTime = Math.abs(currentDate.getTime() - createdAt.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return totalDays - diffDays;
    }
}
exports.default = Comment;
