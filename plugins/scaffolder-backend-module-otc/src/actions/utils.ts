// Most of the content is coming from https://github.com/backstage/backstage/blob/master/plugins/scaffolder-backend/src/scaffolder/actions/builtin/publish/{util.ts,helpers.ts}
// since those functions are not exported
//
import { InputError } from '@backstage/errors';
// import { ScmIntegrationRegistry } from '@backstage/integration';
import { Git } from '@backstage/backend-common';
import { isChildPath } from '@backstage/backend-common';
import { join as joinPath, normalize as normalizePath } from 'path';
import { Logger } from 'winston';

export type RepoSpec = {
  repo: string;
  host: string;
  owner?: string;
  organization?: string;
  workspace?: string;
  project?: string;
};

export const parseRepoUrl = (
  repoUrl: string,
  // integrations: ScmIntegrationRegistry,
): RepoSpec => {
  let parsed;
  try {
    parsed = new URL(`https://${repoUrl}`);
  } catch (error) {
    throw new InputError(
      `Invalid repo URL passed to publisher, got ${repoUrl}, ${error}`,
    );
  }
  const host = parsed.host;
  const owner = parsed.searchParams.get('owner') ?? undefined;
  const organization = parsed.searchParams.get('organization') ?? undefined;
  const workspace = parsed.searchParams.get('workspace') ?? undefined;
  const project = parsed.searchParams.get('project') ?? undefined;

  const repo: string = parsed.searchParams.get('repo')!;
  checkRequiredParams(parsed, 'repo', 'owner');

  return { host, owner, repo, organization, workspace, project };
};

function checkRequiredParams(repoUrl: URL, ...params: string[]) {
  for (let i = 0; i < params.length; i++) {
    if (!repoUrl.searchParams.get(params[i])) {
      throw new InputError(
        `Invalid repo URL passed to publisher: ${repoUrl.toString()}, missing ${
          params[i]
        }`,
      );
    }
  }
}

export async function cloneRepo({
  dir,
  auth,
  logger,
  remoteRef,
  repoUrl,
}: {
  dir: string;
  // For use cases where token has to be used with Basic Auth
  // it has to be provided as password together with a username
  // which may be a fixed value defined by the provider.
  auth: { username: string; password: string } | { token: string };
  logger: Logger;
  remoteRef?: string;
  repoUrl: string;
}): Promise<any> {
  const git = Git.fromAuth({
    ...auth,
    logger,
  });

  await git.clone({ url: repoUrl, dir, ref: remoteRef });
}

export async function commitAndPushRepo({
  dir,
  auth,
  logger,
  commitMessage,
  gitAuthorInfo,
  branchName,
  remoteRef,
}: {
  dir: string;
  // For use cases where token has to be used with Basic Auth
  // it has to be provided as password together with a username
  // which may be a fixed value defined by the provider.
  auth: { username: string; password: string } | { token: string };
  logger: Logger;
  commitMessage: string;
  gitAuthorInfo?: { name?: string; email?: string };
  branchName: string;
  remoteRef?: string;
}): Promise<{ commitHash: string }> {
  const git = Git.fromAuth({
    ...auth,
    logger,
  });

  await git.fetch({ dir });
  await git.branch({ dir, ref: branchName });
  await git.checkout({ dir, ref: branchName });
  await git.add({ dir, filepath: '.' });

  // use provided info if possible, otherwise use fallbacks
  const authorInfo = {
    name: gitAuthorInfo?.name ?? 'Scaffolder',
    email: gitAuthorInfo?.email ?? 'scaffolder@backstage.io',
  };

  const commitHash = await git.commit({
    dir,
    message: commitMessage,
    author: authorInfo,
    committer: authorInfo,
  });

  await git.push({
    dir,
    remote: 'origin',
    remoteRef: remoteRef ?? `refs/heads/${branchName}`,
  });

  return { commitHash };
}

export const getRepoSourceDirectory = (
  workspacePath: string,
  sourcePath: string | undefined,
) => {
  if (sourcePath) {
    const safeSuffix = normalizePath(sourcePath).replace(
      /^(\.\.(\/|\\|$))+/,
      '',
    );
    const path = joinPath(workspacePath, safeSuffix);
    if (!isChildPath(workspacePath, path)) {
      throw new Error('Invalid source path');
    }
    return path;
  }
  return workspacePath;
};
