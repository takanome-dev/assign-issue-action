import * as core from '@actions/core'
import { Octokit } from '@octokit/core'
import { throttling } from '@octokit/plugin-throttling'

const ThrottledOctokit = Octokit.plugin(throttling)

export type OctokitClient = InstanceType<typeof ThrottledOctokit>

export interface ThrottleOptions {
  method: string
  url: string
}

export function createOctokitClient(token: string): OctokitClient {
  return new ThrottledOctokit({
    auth: token,
    throttle: {
      onRateLimit: (
        retryAfter: number,
        options: ThrottleOptions,
        _octokit: OctokitClient,
        retryCount: number,
      ) => {
        core.warning(
          `Request quota exhausted for request ${options.method} ${options.url}`,
        )

        if (retryCount < 1) {
          core.warning(`Retrying after ${retryAfter} seconds!`)
          return true
        }
        return false
      },
      onSecondaryRateLimit: (
        retryAfter: number,
        options: ThrottleOptions,
        _octokit: OctokitClient,
        retryCount: number,
      ) => {
        core.warning(
          `SecondaryRateLimit detected for request ${options.method} ${options.url}`,
        )

        if (retryCount < 2) {
          core.warning(
            `Secondary rate limit hit. Retrying after ${retryAfter} seconds!`,
          )
          return true
        }
        return false
      },
    },
  })
}
