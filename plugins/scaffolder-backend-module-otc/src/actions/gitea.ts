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
import { NotFoundError, ConflictError } from '@backstage/errors';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { ScmIntegrationRegistry } from '@backstage/integration';
import { Config } from '@backstage/config';
import { InputError } from '@backstage/errors';

import {
  parseRepoUrl,
  initRepoAndPush,
  getRepoSourceDirectory,
} from './utils';

/**
 * Create a new action that creates a gitea repository.
 *
 * @public
 */
export const createPublishGiteaAction = (options: {
  integrations: ScmIntegrationRegistry;
  config: Config;
}) => {
  const { integrations, config } = options;

  return createTemplateAction<{
    repoUrl: string;
    description?: string;
    defaultBranch?: string;
    gitCommitMessage?: string;
    sourcePath?: string;
  }>({
    id: 'publish:gitea',
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
          description: {
            type: 'string',
            title: 'Repository Request Description',
            description: 'The description of the repository',
          },
          defaultBranch: {
            type: 'string',
            title: 'Destination Branch name',
            description: 'Branch name containing changes',
          },
          sourcePath: {
            type: 'string',
            title: 'Working Subdirectory',
            description:
              'Subdirectory of working directory to copy changes from',
          },
          gitCommitMessage: {
            title: 'Git Commit Message',
            type: 'string',
            description: `Sets the commit message on the repository.`,
          },
        },
      },
      output: {
        type: 'object',
        properties: {
          remoteUrl: {
            title: 'Remote URL',
            type: 'string',
            description: 'Link to the repository in Gitea',
          },
        },
      },
    },
    async handler(ctx) {
      const {
        repoUrl,
        description,
        defaultBranch = 'main',
        sourcePath,
        gitCommitMessage,
      } = ctx.input;

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
      const gitAuthorInfo = {
        name: config.getOptionalString('scaffolder.defaultAuthor.name'),
        email: config.getOptionalString('scaffolder.defaultAuthor.email'),
      };

      try {
        const baseUrl =
          integrationConfig.config.baseUrl ??
          `https://${integrationConfig.config.host}`;
        const apiBaseUrl = `${baseUrl}/api/v1`;

        const post_url = `${apiBaseUrl}/orgs/${owner}/repos`;
        const response = await fetch(post_url, {
          method: 'POST',
          body: JSON.stringify({
            auto_init: false,
            name: repo,
            default_branch: defaultBranch,
            description: description,
          }),
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `token ${integrationConfig.config.password}`,
          },
        });
        if (!response.ok) {
          const message = `Request failed for ${post_url}, ${response.status} ${response.statusText}`;
          if (response.status === 404) {
            throw new NotFoundError(message);
          } else if (response.status === 409) {
            const message = `Repository ${repo} already exists`;
            throw new ConflictError(message);
          }
          const errorBody = await response.text();
          ctx.logger.error(errorBody);
          throw new Error(message);
        }
        const repo_data = await response.json();
        await initRepoAndPush({
          dir: getRepoSourceDirectory(ctx.workspacePath, sourcePath),
          remoteUrl: repo_data.clone_url,
          auth,
          defaultBranch,
          logger: ctx.logger,
          commitMessage: gitCommitMessage
            ? gitCommitMessage
            : config.getOptionalString('scaffolder.defaultCommitMessage'),
          gitAuthorInfo,
        });

        ctx.logger?.info(`Repository available on ${repo_data.html_url}`);
        ctx.output('repositoryUrl', repo_data.html_url);
      } catch (e) {
        throw new InputError(`Repository creation failed ${e}`);
      }
    },
  });
};
