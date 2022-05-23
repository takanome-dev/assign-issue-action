import { getInput } from '@actions/core';
import { Inputs } from '../types';

export default function getInputs(): Inputs {
  return {
    assigned_label: getInput('assigned_label'),
    required_label: getInput('required_label'),
    pin_label: getInput('pin_label'),
    days_until_unassign: parseInt(getInput('days_until_unassign'), 10),
    stale_assignment_label: getInput('stale_assignment_label'),
    assigned_comment: getInput('assigned_comment'),
    github_token: getInput('github_token'),
  };
}
