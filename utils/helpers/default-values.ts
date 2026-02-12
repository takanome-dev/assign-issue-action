import fs from 'node:fs'
import path from 'node:path'
import jsYaml from 'js-yaml'

/**
 * Helper that reads the `action.yml` and includes the default values
 * for each input as an environment variable, like the Actions runtime does.
 */
export function getDefaultValues(): Record<string, string> {
  const yaml = fs.readFileSync(path.join(__dirname, '../../action.yml'), 'utf8')

  const { inputs } = jsYaml.load(yaml) as any

  return Object.keys(inputs).reduce(
    (acc, key) => {
      if ('default' in inputs[key]) {
        acc[`INPUT_${key.toUpperCase()}`] = inputs[key].default
      }
      return acc
    },
    {} as Record<string, string>,
  )
}
