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

import fetch from 'node-fetch';

import { NotFoundError } from '@backstage/errors';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { ScmIntegrationRegistry } from '@backstage/integration';
import { Config } from '@backstage/config';
import { InputError } from '@backstage/errors';

import {
  parseRepoUrl,
  commitAndPushRepo,
  getRepoSourceDirectory,
} from './utils';

/**
 * Create a new action that creates a gitea pull request.
 *
 * @public
 */
export const createPublishGiteaPullRequestAction = (options: {
  integrations: ScmIntegrationRegistry;
  config: Config;
}) => {
  const { integrations, config } = options;

  return createTemplateAction<{
    repoUrl: string;
    title: string;
    description: string;
    branchName: string;
    sourcePath?: string;
    targetPath?: string;
    commitMessage: string;
  }>({
    id: 'publish:gitea:pull-request',
    schema: {
      input: {
        required: ['repoUrl', 'branchName'],
        type: 'object',
        properties: {
          repoUrl: {
            type: 'string',
            title: 'Repository Location',
            description: `Accepts the format 'gitea.com?owner=org&repo=project_name' where 'project_name' is the repository name and 'owner' is a group or username`,
          },
          title: {
            type: 'string',
            title: 'Pull Request Name',
            description: 'The name for the pull request',
          },
          description: {
            type: 'string',
            title: 'Pull Request Description',
            description: 'The description of the pull request',
          },
          branchName: {
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
          targetPath: {
            type: 'string',
            title: 'Repository Subdirectory',
            description: 'Subdirectory of repository to apply changes to',
          },
          commitMessage: {
            title: 'Git Commit Message',
            type: 'string',
            description: `Sets the commit message on the repository.`,
          },
        },
      },
      output: {
        type: 'object',
        properties: {
          pullRequestUrl: {
            title: 'PullRequest(PR) URL',
            type: 'string',
            description: 'Link to the pull request in Gitea',
          },
        },
      },
    },
    async handler(ctx) {
      const {
        branchName,
        description,
        repoUrl,
        sourcePath,
        title,
        commitMessage,
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

      await commitAndPushRepo({
        dir: getRepoSourceDirectory(ctx.workspacePath, sourcePath),
        auth,
        logger: ctx.logger,
        commitMessage: commitMessage ?? title,
        gitAuthorInfo,
        branchName,
      });

      try {
        const baseUrl =
          integrationConfig.config.baseUrl ??
          `https://${integrationConfig.config.host}`;
        const apiBaseUrl = `${baseUrl}/api/v1`;

        const post_url = `${apiBaseUrl}/repos/${owner}/${repo}/pulls`;
        const response = await fetch(post_url, {
          method: 'POST',
          body: JSON.stringify({
            title: title,
            body: description,
            head: branchName,
            base: 'main',
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
          }
          const errorBody = await response.text();
          ctx.logger.error(errorBody);
          throw new Error(message);
        }
        const pr_data = await response.json();
        ctx.logger?.info(`Review available on ${pr_data.url}`);
        ctx.output('pullRequestUrl', pr_data.url);
      } catch (e) {
        throw new InputError(`Pull request creation failed ${e}`);
      }
    },
  });
};
