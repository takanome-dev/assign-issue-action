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
const core_1 = require("@actions/core");
const issue_1 = __importDefault(require("./issue"));
function scheduleHandler() {
    return __awaiter(this, void 0, void 0, function* () {
        const issueHandler = new issue_1.default();
        // Find all open issues with the assigned_label
        const issues = yield issueHandler.getIssues();
        (0, core_1.info)(`⚙ Processing ${issues.length} issues:`);
        for (const issue of issues) {
            // Ensure that the issue is assigned to someone
            if (!issue.assignee)
                continue;
            // Unassign the user
            (0, core_1.info)(`🔗 UnAssigning @${issue.assignee.login} from issue #${issue.number}`);
            yield issueHandler.unassignIssue(issue);
            (0, core_1.info)(`✅ Done processing issue #${issue.number}`);
        }
    });
}
exports.default = scheduleHandler;
