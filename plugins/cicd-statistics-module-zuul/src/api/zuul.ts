/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ResponseError } from '@backstage/errors';
import { Entity } from '@backstage/catalog-model';
import { DiscoveryApi } from '@backstage/core-plugin-api';

import {
  CicdStatisticsApi,
  CicdState,
  CicdConfiguration,
  CicdDefaults,
  FetchBuildsOptions,
  FilterStatusType,
} from '@backstage-community/plugin-cicd-statistics';

export const ZUUL_TENANT_ANNOTATION = 'zuul-ci.org/tenant';
export const ZUUL_PROJECT_ANNOTATION = 'zuul-ci.org/project';

export const isZuulAvailable = (entity: Entity) =>
  Boolean(
    entity?.metadata.annotations?.[ZUUL_PROJECT_ANNOTATION] &&
      entity?.metadata.annotations?.[ZUUL_TENANT_ANNOTATION],
  );

const statusMap: Record<string, FilterStatusType> = {
  RUNNING: 'running',
  SUCCESS: 'succeeded',
  DEQUEUED: 'aborted',
  FAILURE: 'failed',
  RETRY_LIMIT: 'failed',
  POST_FAILURE: 'failed',
  SKIPPED: 'unknown',
  NODE_FAILURE: 'failed',
  MERGE_CONFLICT: 'failed',
  MERGE_FAILURE: 'failed',
  CONFIG_ERROR: 'failed',
  CANCELLED: 'aborted',
  TIMED_OUT: 'failed',
  ERROR: 'failed',
  RETRY: 'unknown',
  DISK_FULL: 'unknown',
  NO_JOBS: 'unknown',
  DISCONNECT: 'unknown',
  ABORTED: 'aborted',
  LOST: 'unknown',
  EXCEPTION: 'failed',
  NO_HANDLE: 'unknown',
};

/**
 * Extracts the CI/CD statistics from a Zuul
 *
 * @public
 */
export class CicdStatisticsApiZuul implements CicdStatisticsApi {
  discoveryApi: DiscoveryApi;
  readonly #cicdDefaults: Partial<CicdDefaults>;

  constructor(
    { discoveryApi }: { discoveryApi: DiscoveryApi },
    cicdDefaults: Partial<CicdDefaults> = {},
  ) {
    this.#cicdDefaults = cicdDefaults;
    this.discoveryApi = discoveryApi;
  }

  public async fetchBuilds(options: FetchBuildsOptions): Promise<CicdState> {
    const { entity, updateProgress } = options;
    updateProgress(0, 0, 0);
    if (
      !entity ||
      !entity.metadata ||
      !entity.metadata.annotations ||
      !entity.metadata.annotations['zuul-ci.org/tenant'] ||
      !entity.metadata.annotations['zuul-ci.org/project']
    ) {
      return { builds: [] };
    }
    const tenant = entity.metadata.annotations['zuul-ci.org/tenant'];
    const project = entity.metadata.annotations['zuul-ci.org/project'];
    const proxyUri = await this.discoveryApi.getBaseUrl('proxy');
    const url = `${proxyUri}/zuul/tenant/${tenant}/buildsets?${new URLSearchParams(
      { project: project },
    ).toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw await ResponseError.fromResponse(response);
    }

    const builds = await response.json();

    return {
      builds: builds.map((build: any) => {
        return {
          id: build.uuid,
          stages: [
            {
              name: build.pipeline,
              status: statusMap[build.result],
              duration: build.duration,
            },
          ],
          requestedAt: new Date(build.event_timestamp),
          branchType: build.branch,
          status: statusMap[build.result],
          duration: build.duration,
        };
      }),
    };
  }

  public async getConfiguration(): Promise<Partial<CicdConfiguration>> {
    return {
      availableStatuses: ['succeeded', 'failed', 'aborted'] as const,
      defaults: this.#cicdDefaults,
    };
  }
}
