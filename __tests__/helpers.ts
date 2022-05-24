import fs from 'fs';
import jsYaml from 'js-yaml';
import nock from 'nock';
import path from 'path';

export interface Endpoint {
  uri: string | RegExp;
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  response: { status: number; body?: any };
}

function nockRequests(endpoints: Endpoint[]) {
  const scope = nock('https://api.github.com');
  const requests: Array<{ uri: string; reqBody: any }> = [];

  for (const [index, endpoint] of endpoints.entries()) {
    scope[endpoint.method](endpoint.uri).reply(
      endpoint.response.status,
      (uri, reqBody) => {
        requests[index] = { uri, reqBody };
        return endpoint.response.body;
      }
    );
  }

  return { scope, requests };
}

/**
 * Helper that reads the `action.yml` and includes the default values
 * for each input as an environment variable, like the Actions runtime does.
 */
function getDefaultValues() {
  // eslint-disable-next-line no-undef
  const yaml = fs.readFileSync(path.join(__dirname, '../action.yml'), 'utf8');
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
  nockRequests,
  getDefaultValues,
};
