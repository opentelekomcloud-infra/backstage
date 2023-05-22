/*
 *
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
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { ScmIntegrationRegistry } from '@backstage/integration';
import { InputError } from '@backstage/errors';

import { parseRepoUrl, cloneRepo, getRepoSourceDirectory } from './utils';

/**
 *
 * @public
 */
export const createGiteaCloneAction = (options: {
  integrations: ScmIntegrationRegistry;
}) => {
  const { integrations } = options;

  return createTemplateAction<{
    repoUrl: string;
    branchName?: string;
    workingDirectory?: string;
  }>({
    id: 'gitea:clone',
    schema: {
      input: {
        required: ['repoUrl'],
        type: 'object',
        properties: {
          repoUrl: {
            type: 'string',
            title: 'Repository Location',
            description: `Accepts the format 'gitea.com?owner=org&repo=project_name' where 'project_name' is the repository name and 'owner' is a group or username`,
          },
          branchName: {
            type: 'string',
            title: 'Destination Branch name',
            description: 'Branch name containing changes',
          },
          workingDirectory: {
            type: 'string',
            title: 'Working directory',
            description: 'Working directory within the scaffolder workspace to execute the command in',
          },
        },
      },
      output: {
        type: 'object',
        properties: {},
      },
    },
    async handler(ctx) {
      const { repoUrl, branchName =  'main', workingDirectory} = ctx.input;

      const { host, owner, repo } = parseRepoUrl(repoUrl);

      const integrationConfig = integrations.gitea.byHost(host);

      if (!integrationConfig) {
        throw new InputError(
          `No matching integration configuration for host ${host}, please check your integrations config`,
        );
      }

      const auth = {
        username: integrationConfig.config.username!,
        password: integrationConfig.config.password!,
      };

      await cloneRepo({
        dir: getRepoSourceDirectory(ctx.workspacePath, workingDirectory),
        auth,
        logger: ctx.logger,
        remoteRef: `refs/heads/${branchName}` ?? 'refs/heads/main',
        repoUrl: `https://${host}/${owner}/${repo}`,
      });
    },
  });
};
