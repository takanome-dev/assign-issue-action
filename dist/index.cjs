"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/index.ts
var import_core = require("@actions/core");
var import_github3 = require("@actions/github");

// src/handlers/comment-handler.ts
var core = __toESM(require("@actions/core"), 1);
var import_mustache = __toESM(require("mustache"), 1);
var import_github = require("@actions/github");
var import_date_fns = require("date-fns");
var CommentHandler = class {
  constructor() {
    this.context = import_github.context;
    this.issue = this.context.payload.issue;
    this.comment = this.context.payload.comment;
    this.token = core.getInput("github_token" /* GITHUB_TOKEN */);
    this.client = (0, import_github.getOctokit)(this.token);
  }
  handle_issue_comment() {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    core.info(
      `\u{1F916} Checking commands in the issue (#${(_a = this.issue) == null ? void 0 : _a.number}) comments"`
    );
    if (!this.token) {
      return core.setFailed(
        `\u{1F6AB} Missing required input "token", received "${this.token}"`
      );
    }
    const requiredLabel = core.getInput("required_label" /* REQUIRED_LABEL */);
    if (requiredLabel) {
      const hasLabel = (_c = (_b = this.issue) == null ? void 0 : _b.labels) == null ? void 0 : _c.find(
        (label) => label.name === requiredLabel
      );
      if (!hasLabel) {
        return core.setFailed(
          `\u{1F6AB} Missing required label: "${core.getInput(
            "required_label"
          )}" not found in issue #${(_d = this.issue) == null ? void 0 : _d.number}.`
        );
      }
    }
    const selfAssignCmd = core.getInput("self_assign_cmd" /* SELF_ASSIGN_CMD */);
    const selfUnassignCmd = core.getInput("self_unassign_cmd" /* SELF_UNASSIGN_CMD */);
    const assignCommenterCmd = core.getInput("assign_user_cmd" /* ASSIGN_USER_CMD */);
    const unassignCommenterCmd = core.getInput("unassign_user_cmd" /* UNASSIGN_USER_CMD */);
    const enableAutoSuggestion = core.getBooleanInput(
      "enable_auto_suggestion" /* ENABLE_AUTO_SUGGESTION */
    );
    const maintainersInput = core.getInput("maintainers" /* MAINTAINERS */);
    const maintainers = maintainersInput.split(",");
    const body = ((_e = this.context.payload.comment) == null ? void 0 : _e.body).toLowerCase();
    if (enableAutoSuggestion && this._contribution_phrases().some(
      (phrase) => body.includes(phrase.toLowerCase())
    )) {
      core.info(`\u{1F916} Comment indicates interest in contribution: ${body}`);
      return this.$_handle_assignment_interest();
    }
    if (body === selfAssignCmd) {
      return this.$_handle_self_assignment();
    }
    if (body === selfUnassignCmd) {
      return this.$_handle_self_unassignment();
    }
    if (maintainers.length > 0) {
      if (maintainers.includes((_g = (_f = this.comment) == null ? void 0 : _f.user) == null ? void 0 : _g.login)) {
        if (body.startsWith(assignCommenterCmd)) {
          return this.$_handle_user_assignment(assignCommenterCmd);
        }
        if (body.startsWith(unassignCommenterCmd)) {
          return this.$_handle_user_unassignment(unassignCommenterCmd);
        }
      } else {
        return core.info(
          `\u{1F916} Ignoring comment because the commenter is not in the list of maintainers specified in the config file`
        );
      }
    } else {
      return core.info(
        `\u{1F916} Ignoring comment because the "maintainers" input in the config file is empty`
      );
    }
    return core.info(
      `\u{1F916} Ignoring comment: ${(_h = this.context.payload.comment) == null ? void 0 : _h.id} because it does not contain a supported command.`
    );
  }
  $_handle_assignment_interest() {
    return __async(this, null, function* () {
      var _a, _b;
      return yield this._create_comment(
        "assignment_suggestion_comment" /* ASSIGNMENT_SUGGESTION_COMMENT */,
        {
          handle: (_b = (_a = this.comment) == null ? void 0 : _a.user) == null ? void 0 : _b.login
        }
      );
    });
  }
  $_handle_self_assignment() {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p;
      core.info(
        `\u{1F916} Starting assignment for issue #${(_a = this.issue) == null ? void 0 : _a.number} in repo "${this.context.repo.owner}/${this.context.repo.repo}"`
      );
      const daysUntilUnassign = Number(core.getInput("days_until_unassign" /* DAYS_UNTIL_UNASSIGN */));
      if ((_b = this.issue) == null ? void 0 : _b.assignee) {
        yield this._create_comment(
          "already_assigned_comment" /* ALREADY_ASSIGNED_COMMENT */,
          {
            unassigned_date: String(daysUntilUnassign),
            handle: (_d = (_c = this.comment) == null ? void 0 : _c.user) == null ? void 0 : _d.login,
            assignee: (_f = (_e = this.issue) == null ? void 0 : _e.assignee) == null ? void 0 : _f.login
          }
        );
        core.setOutput("assigned", "no");
        return core.info(
          `\u{1F916} Issue #${(_g = this.issue) == null ? void 0 : _g.number} is already assigned to @${(_i = (_h = this.issue) == null ? void 0 : _h.assignee) == null ? void 0 : _i.login}`
        );
      }
      core.info(
        `\u{1F916} Assigning @${(_k = (_j = this.comment) == null ? void 0 : _j.user) == null ? void 0 : _k.login} to issue #${(_l = this.issue) == null ? void 0 : _l.number}`
      );
      core.info(`\u{1F916} Adding comment to issue #${(_m = this.issue) == null ? void 0 : _m.number}`);
      yield Promise.all([
        this._add_assignee(),
        this._create_comment("assigned_comment" /* ASSIGNED_COMMENT */, {
          total_days: daysUntilUnassign,
          unassigned_date: (0, import_date_fns.format)(
            (0, import_date_fns.add)(/* @__PURE__ */ new Date(), { days: daysUntilUnassign }),
            "dd LLLL y"
          ),
          handle: (_o = (_n = this.comment) == null ? void 0 : _n.user) == null ? void 0 : _o.login,
          pin_label: core.getInput("pin_label" /* PIN_LABEL */)
        })
      ]);
      core.info(`\u{1F916} Issue #${(_p = this.issue) == null ? void 0 : _p.number} assigned!`);
      return core.setOutput("assigned", "yes");
    });
  }
  $_handle_self_unassignment() {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      core.info(
        `\u{1F916} Starting issue #${(_a = this.issue) == null ? void 0 : _a.number} unassignment for user @${(_b = this.issue) == null ? void 0 : _b.assignee.login} in repo "${this.context.repo.owner}/${this.context.repo.repo}"`
      );
      if (((_d = (_c = this.issue) == null ? void 0 : _c.assignee) == null ? void 0 : _d.login) === ((_f = (_e = this.comment) == null ? void 0 : _e.user) == null ? void 0 : _f.login)) {
        yield Promise.all([
          this._remove_assignee(),
          this._create_comment(
            "unassigned_comment" /* UNASSIGNED_COMMENT */,
            { handle: (_h = (_g = this.comment) == null ? void 0 : _g.user) == null ? void 0 : _h.login }
          )
        ]);
        core.info(`\u{1F916} Done issue unassignment!`);
        return core.setOutput("unassigned", "yes");
      }
      core.setOutput("unassigned", "no");
      return core.info(
        `\u{1F916} Commenter is different from the assignee, ignoring...`
      );
    });
  }
  $_handle_user_assignment(input) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e, _f, _g;
      core.info(`Starting issue assignment to user`);
      const idx = (_a = this.comment) == null ? void 0 : _a.body.indexOf(input);
      if (idx !== -1) {
        const afterAssignCmd = (_c = (_b = this.comment) == null ? void 0 : _b.body) == null ? void 0 : _c.slice(idx + input.length).trim();
        const userHandleMatch = afterAssignCmd.match(/@([a-zA-Z0-9-]{1,39})/);
        if (userHandleMatch && userHandleMatch[1]) {
          const userHandle = userHandleMatch[1];
          core.info(
            `\u{1F916} Assigning @${userHandle} to issue #${(_d = this.issue) == null ? void 0 : _d.number}`
          );
          const daysUntilUnassign = Number(
            core.getInput("days_until_unassign" /* DAYS_UNTIL_UNASSIGN */)
          );
          yield Promise.all([
            this.client.rest.issues.addAssignees(__spreadProps(__spreadValues({}, this.context.repo), {
              issue_number: (_e = this.issue) == null ? void 0 : _e.number,
              assignees: [userHandle.trim()]
            })),
            this.client.rest.issues.addLabels(__spreadProps(__spreadValues({}, this.context.repo), {
              issue_number: (_f = this.issue) == null ? void 0 : _f.number,
              labels: [core.getInput("assigned_label" /* ASSIGNED_LABEL */)]
            })),
            this._create_comment("assigned_comment" /* ASSIGNED_COMMENT */, {
              total_days: daysUntilUnassign,
              unassigned_date: (0, import_date_fns.format)(
                (0, import_date_fns.add)(/* @__PURE__ */ new Date(), { days: daysUntilUnassign }),
                "dd LLLL y"
              ),
              handle: userHandle,
              pin_label: core.getInput("pin_label" /* PIN_LABEL */)
            })
          ]);
          core.info(`\u{1F916} Issue #${(_g = this.issue) == null ? void 0 : _g.number} assigned!`);
          return core.setOutput("assigned", "yes");
        } else {
          core.info(`No valid user handle found after /assign command`);
          return core.setOutput("assigned", "no");
        }
      }
    });
  }
  $_handle_user_unassignment(input) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e, _f, _g;
      core.info(`Starting issue unassignment to user`);
      const idx = (_a = this.comment) == null ? void 0 : _a.body.indexOf(input);
      if (idx !== -1) {
        const afterAssignCmd = (_c = (_b = this.comment) == null ? void 0 : _b.body) == null ? void 0 : _c.slice(idx + input.length).trim();
        const userHandleMatch = afterAssignCmd.match(/@([a-zA-Z0-9-]{1,39})/);
        if (userHandleMatch && userHandleMatch[1]) {
          const userHandle = userHandleMatch[1];
          if (((_e = (_d = this.issue) == null ? void 0 : _d.assignee) == null ? void 0 : _e.login) === userHandle) {
            yield Promise.all([
              this._remove_assignee(),
              this._create_comment(
                "unassigned_comment" /* UNASSIGNED_COMMENT */,
                { handle: userHandle }
              )
            ]);
            core.setOutput("unassigned", "yes");
            return core.info(
              `\u{1F916} User @${userHandle} is unassigned from the issue #${(_f = this.issue) == null ? void 0 : _f.number}`
            );
          }
          core.setOutput("unassigned", "no");
          return core.info(
            `\u{1F916} User @${userHandle} is not assigned to the issue #${(_g = this.issue) == null ? void 0 : _g.number}`
          );
        } else {
          core.setOutput("unassigned", "no");
          return core.info(`No valid user handle found after /assign command`);
        }
      }
    });
  }
  _add_assignee() {
    var _a, _b, _c;
    return Promise.all([
      this.client.rest.issues.addAssignees(__spreadProps(__spreadValues({}, this.context.repo), {
        issue_number: (_a = this.issue) == null ? void 0 : _a.number,
        assignees: [(_b = this.comment) == null ? void 0 : _b.user.login]
      })),
      this.client.rest.issues.addLabels(__spreadProps(__spreadValues({}, this.context.repo), {
        issue_number: (_c = this.issue) == null ? void 0 : _c.number,
        labels: [core.getInput("assigned_label" /* ASSIGNED_LABEL */)]
      }))
    ]);
  }
  _remove_assignee() {
    var _a, _b, _c;
    return Promise.all([
      this.client.rest.issues.removeAssignees(__spreadProps(__spreadValues({}, this.context.repo), {
        issue_number: (_a = this.issue) == null ? void 0 : _a.number,
        assignees: [(_b = this.issue) == null ? void 0 : _b.assignee.login]
      })),
      this.client.rest.issues.removeLabel(__spreadProps(__spreadValues({}, this.context.repo), {
        issue_number: (_c = this.issue) == null ? void 0 : _c.number,
        name: core.getInput("assigned_label" /* ASSIGNED_LABEL */)
      }))
    ]);
  }
  //! this should calculate how many times is left before the current
  //! assign get unassign by the action
  // private async _already_assigned_comment(totalDays: number) {
  //   const comments = await this.client.rest.issues.listComments({
  //     ...this.context.repo,
  //     issue_number: this.issue?.number!,
  //   });
  //   // TODO: should return the comments made by the assigned user to search which one contains the cmd
  //   const assignedComment = comments.data.find(
  //     (comment) => comment.user!.login === this.issue?.assignee?.login,
  //   );
  //   if (!assignedComment) {
  //     // TODO: maybe post a comment here?
  //     return core.info(
  //       `🤖 Issue #${this.issue?.number} is already assigned to @${this.issue?.assignee?.login}`,
  //     );
  //   }
  //   const daysUntilUnassign = formatDistanceStrict(
  //     new Date(assignedComment?.created_at),
  //     add(new Date(assignedComment.created_at), { days: totalDays }),
  //   );
  //   await this._create_comment<AlreadyAssignedCommentArg>(
  //     INPUTS.ALREADY_ASSIGNED_COMMENT,
  //     {
  //       unassigned_date: daysUntilUnassign,
  //       handle: this.comment?.user?.login,
  //       assignee: this.issue?.assignee?.login,
  //     },
  //   );
  // }
  _create_comment(input, options) {
    var _a;
    const body = import_mustache.default.render(core.getInput(input), options);
    return this.client.rest.issues.createComment(__spreadProps(__spreadValues({}, this.context.repo), {
      issue_number: (_a = this.issue) == null ? void 0 : _a.number,
      body
    }));
  }
  _contribution_phrases() {
    return [
      "assign this issue to me",
      "I would like to work on this issue",
      "can I take on this issue",
      "may I work on this issue",
      "I'm keen to have a go",
      "I am here to do a university assignment",
      "I hope to contribute to this issue",
      "can I be assigned to this issue",
      "is this issue available to work on",
      "I would be happy to pick this up",
      "I want to take this issue",
      "I have read through this issue and want to contribute",
      "is this issue still open for contribution",
      "Hi, can I take this issue",
      "I would love to work on this issue",
      "Hey, I'd like to be assigned to this issue",
      "Please assign me to this issue"
    ];
  }
};

// src/handlers/schedule-handler.ts
var core2 = __toESM(require("@actions/core"), 1);
var import_github2 = require("@actions/github");
var ScheduleHandler = class {
  constructor() {
    this.token = core2.getInput("github_token" /* GITHUB_TOKEN */, { required: true });
    this.client = (0, import_github2.getOctokit)(this.token);
    this.assignedLabel = core2.getInput("assigned_label" /* ASSIGNED_LABEL */);
    this.exemptLabel = core2.getInput("pin_label" /* PIN_LABEL */);
  }
  handle_unassignments() {
    return __async(this, null, function* () {
      const issues = yield this.getIssues();
      core2.info(`\u2699 Processing ${issues.length} issues:`);
      for (const issue of issues) {
        if (!issue.assignee) continue;
        core2.info(
          `\u{1F517} UnAssigning @${issue.assignee.login} from issue #${issue.number}`
        );
        yield this.unassignIssue(issue);
        core2.info(`\u2705 Done processing issue #${issue.number}`);
      }
    });
  }
  getIssues() {
    return __async(this, null, function* () {
      const { owner, repo } = import_github2.context.repo;
      const totalDays = Number(core2.getInput("days_until_unassign" /* DAYS_UNTIL_UNASSIGN */));
      const timestamp = this.since(totalDays);
      const q = [
        // Only get issues with the label that shows they've been assigned
        `label:"${this.assignedLabel}"`,
        // Don't include include pinned issues
        `-label:"${this.exemptLabel}"`,
        // Only include issues, not PRs
        "is:issue",
        // Only search within this repository
        `repo:${owner}/${repo}`,
        // Only find issues/PRs with an assignee.
        "assigned:*",
        // Only find opened issues/PRs
        "is:open",
        // Updated within the last 7 days (or whatever the user has set for "days_until_unassign")
        `updated:<${timestamp}`
      ];
      const issues = yield this.client.rest.search.issuesAndPullRequests({
        q: q.join(" "),
        sort: "updated",
        order: "desc",
        per_page: 100
      });
      return issues.data.items;
    });
  }
  unassignIssue(issue) {
    return __async(this, null, function* () {
      return Promise.all([
        this.client.rest.issues.removeAssignees(__spreadProps(__spreadValues({}, import_github2.context.repo), {
          issue_number: issue == null ? void 0 : issue.number,
          assignees: [issue == null ? void 0 : issue.assignee.login]
        })),
        this.client.rest.issues.removeLabel(__spreadProps(__spreadValues({}, import_github2.context.repo), {
          issue_number: issue == null ? void 0 : issue.number,
          name: this.assignedLabel
        }))
      ]);
    });
  }
  since(days) {
    const totalDaysInMilliseconds = days * 24 * 60 * 60 * 1e3;
    const date = new Date(+/* @__PURE__ */ new Date() - totalDaysInMilliseconds);
    return new Date(date).toISOString().substring(0, 10);
  }
};

// src/index.ts
(() => __async(void 0, null, function* () {
  const event = import_github3.context.eventName;
  try {
    if (event === "issue_comment") {
      const cmtHandler = new CommentHandler();
      yield cmtHandler.handle_issue_comment();
    } else if (event === "workflow_dispatch" || event === "schedule") {
      const scheduleHandler = new ScheduleHandler();
      yield scheduleHandler.handle_unassignments();
    } else {
      return;
    }
  } catch (error) {
    if (error instanceof Error) return (0, import_core.setFailed)(error.message);
  }
}))();
//! not needed if we have list of allowed users who can use the command
