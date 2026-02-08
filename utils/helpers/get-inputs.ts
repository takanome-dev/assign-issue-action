import { getInput } from '@actions/core'
import { INPUTS } from '../lib/inputs'

type Inputs = {
  assigned_label: string
  required_label: string
  pin_label: string
  days_until_unassign: number
  stale_assignment_label: string
  assigned_comment: string
  assignment_suggestion_comment: string
  github_token: string
  maintainers: string
  enable_auto_suggestion: string
  self_assign_cmd: string
  self_unassign_cmd: string
  assign_user_cmd: string
  unassign_user_cmd: string
}

export function getInputs(): Inputs {
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
  }
}
