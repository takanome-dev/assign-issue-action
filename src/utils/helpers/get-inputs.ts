import { getInput } from '@actions/core';
import { INPUTS } from '../lib/inputs';

export function getInputs() {
  return {
    assigned_label: getInput(INPUTS.ASSIGNED_LABEL),
    required_label: getInput(INPUTS.REQUIRED_LABEL),
    pin_label: getInput(INPUTS.PIN_LABEL),
    days_until_unassign: parseInt(getInput(INPUTS.DAYS_UNTIL_UNASSIGN), 10),
    stale_assignment_label: getInput(INPUTS.STALE_ASSIGNMENT_LABEL),
    assigned_comment: getInput(INPUTS.ASSIGNED_COMMENT),
    github_token: getInput(INPUTS.GITHUB_TOKEN),

    self_assign_cmd: getInput(INPUTS.SELF_ASSIGN_CMD),
    self_unassign_cmd: getInput(INPUTS.SELF_UNASSIGN_CMD),
    assign_commenter_cmd: getInput(INPUTS.ASSIGN_COMMENTER_CMD),
    unassign_commenter_cmd: getInput(INPUTS.UNASSIGN_COMMENTER_CMD),
  };
}
