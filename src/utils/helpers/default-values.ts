import fs from 'fs';
import jsYaml from 'js-yaml';
import path from 'path';

/**
 * Helper that reads the `action.yml` and includes the default values
 * for each input as an environment variable, like the Actions runtime does.
 */
export function getDefaultValues() {
  const yaml = fs.readFileSync(
    // eslint-disable-next-line no-undef
    path.join(__dirname, '../../../action.yml'),
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
