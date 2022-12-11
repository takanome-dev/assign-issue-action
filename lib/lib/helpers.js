"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const path_1 = __importDefault(require("path"));
function getInputs() {
    return {
        assigned_label: (0, core_1.getInput)('assigned_label'),
        required_label: (0, core_1.getInput)('required_label'),
        pin_label: (0, core_1.getInput)('pin_label'),
        days_until_unassign: parseInt((0, core_1.getInput)('days_until_unassign'), 10),
        stale_assignment_label: (0, core_1.getInput)('stale_assignment_label'),
        assigned_comment: (0, core_1.getInput)('assigned_comment'),
        github_token: (0, core_1.getInput)('github_token'),
    };
}
/**
 * Helper that reads the `action.yml` and includes the default values
 * for each input as an environment variable, like the Actions runtime does.
 */
function getDefaultValues() {
    const yaml = fs_1.default.readFileSync(
    // eslint-disable-next-line no-undef
    path_1.default.join(__dirname, '../../action.yml'), 'utf8');
    const { inputs } = js_yaml_1.default.load(yaml);
    return Object.keys(inputs).reduce((acc, key) => {
        if ('default' in inputs[key]) {
            return Object.assign(Object.assign({}, acc), { [`INPUT_${key.toUpperCase()}`]: inputs[key].default });
        }
        else {
            return acc;
        }
    }, {});
}
exports.default = {
    getInputs,
    getDefaultValues,
};
