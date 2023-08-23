import { getInput } from '@actions/core';
import fs from 'fs';
import jsYaml from 'js-yaml';
import path from 'path';
import { Inputs } from '../types';

function getInputs(): Inputs {
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

/**
 * Helper that reads the `action.yml` and includes the default values
 * for each input as an environment variable, like the Actions runtime does.
 */
function getDefaultValues() {
  const yaml = fs.readFileSync(
    // eslint-disable-next-line no-undef
    path.join(__dirname, '../../action.yml'),
    'utf8',
  );
  const { inputs } = jsYaml.load(yaml) as any;

  return Object.keys(inputs).reduce((acc, key) => {
    if ('default' in inputs[key]) {
      return {
        ...acc,
        [`INPUT_${key.toUpperCase()}`]: inputs[key].default,
      };
    } else {
      return acc;
    }
  }, {});
}

export default {
  getInputs,
  getDefaultValues,
};
