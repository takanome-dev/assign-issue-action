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
const github_1 = require("@actions/github");
const comment_1 = __importDefault(require("./lib/comment"));
const schedule_1 = __importDefault(require("./lib/schedule"));
(() => __awaiter(void 0, void 0, void 0, function* () {
    const event = github_1.context.eventName;
    try {
        if (event === 'issue_comment') {
            const issue = new comment_1.default();
            yield issue.handleAssignIssue();
        }
        else if (event === 'workflow_dispatch' || event === 'schedule') {
            yield (0, schedule_1.default)();
        }
        else {
            return;
        }
    }
    catch (error) {
        if (error instanceof Error)
            return (0, core_1.setFailed)(error.message);
    }
}))();
