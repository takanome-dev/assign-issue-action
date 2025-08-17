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
    assignment_suggestion_comment: getInput(
      INPUTS.ASSIGNMENT_SUGGESTION_COMMENT,
    ),
    github_token: getInput(INPUTS.GITHUB_TOKEN),
    maintainers: getInput(INPUTS.MAINTAINERS),
    enable_auto_suggestion: getInput(INPUTS.ENABLE_AUTO_SUGGESTION),

    self_assign_cmd: getInput(INPUTS.SELF_ASSIGN_CMD),
    self_unassign_cmd: getInput(INPUTS.SELF_UNASSIGN_CMD),
    assign_user_cmd: getInput(INPUTS.ASSIGN_USER_CMD),
    unassign_user_cmd: getInput(INPUTS.UNASSIGN_USER_CMD),
  };
}
