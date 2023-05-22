/*
 * Copyright 2022 The Backstage Authors
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
import {
  getGiteaRequestOptions,
  getGiteaFileContentsUrl,
  GiteaIntegration,
  ScmIntegrations,
} from '@backstage/integration';
import {
  ReaderFactory,
  ReadTreeResponseFactory,
  ReadTreeResponse,
  ReadTreeOptions,
  SearchResponse,
  UrlReader,
  ReadUrlOptions,
  ReadUrlResponse,
  //  GiteaUrlReader,
} from '@backstage/backend-common';
import fetch, { RequestInit, Response } from 'node-fetch';
import { ReadUrlResponseFactory } from '@backstage/backend-common';
import {
  AuthenticationError,
  NotFoundError,
  NotModifiedError,
} from '@backstage/errors';
import { Readable } from 'stream';

export function parseLastModified(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  return new Date(value);
}

/**
 * Implements a {@link @backstage/backend-plugin-api#UrlReaderService} for the Gitea v1 api.
 *
 * @public
 */
export class OtcGiteaUrlReader /*extends GiteaUrlReader */
  implements UrlReader
{
  static factory: ReaderFactory = ({ config, treeResponseFactory }) => {
    const integrations = ScmIntegrations.fromConfig(config);
    return integrations.gitea.list().map(integration => {
      const reader = new OtcGiteaUrlReader(integration, {
        treeResponseFactory,
      });
      const predicate = (url: URL) => url.host === integration.config.host;
      return { reader, predicate };
    });
  };

  constructor(
    private readonly integration: GiteaIntegration,
    private readonly deps: { treeResponseFactory: ReadTreeResponseFactory },
  ) {
    //      super(integration);
  }

  async read(url: string): Promise<Buffer> {
    const response = await this.readUrl(url);
    return response.buffer();
  }

  async readUrl(
    url: string,
    options?: ReadUrlOptions,
  ): Promise<ReadUrlResponse> {
    let response: Response;
    const blobUrl = getGiteaFileContentsUrl(this.integration.config, url);

    try {
      response = await fetch(blobUrl, {
        method: 'GET',
        ...getGiteaRequestOptions(this.integration.config),
        signal: options?.signal as any,
      });
    } catch (e) {
      throw new Error(`Unable to read ${blobUrl}, ${e}`);
    }

    if (response.ok) {
      // Gitea returns an object with the file contents encoded, not the file itself
      const { encoding, content } = await response.json();

      if (encoding === 'base64') {
        return ReadUrlResponseFactory.fromReadable(
          Readable.from(Buffer.from(content, 'base64')),
          {
            etag: response.headers.get('ETag') ?? undefined,
            lastModifiedAt: parseLastModified(
              response.headers.get('Last-Modified'),
            ),
          },
        );
      }

      throw new Error(`Unknown encoding: ${encoding}`);
    }

    const message = `${url} could not be read as ${blobUrl}, ${response.status} ${response.statusText}`;
    if (response.status === 404) {
      throw new NotFoundError(message);
    }

    if (response.status === 304) {
      throw new NotModifiedError();
    }

    if (response.status === 403) {
      throw new AuthenticationError();
    }

    throw new Error(message);
  }

  async readTree(
    url: string,
    options?: ReadTreeOptions,
  ): Promise<ReadTreeResponse> {
    const config = this.integration.config;
    const baseUrl = config.baseUrl ?? `https://${config.host}`;
    const [_blank, owner, name, _src, _branch, ref, ...path] = url
      .replace(baseUrl, '')
      .replace(/.git$/, '')
      .split('/');

    const repoDetails = await this.getRepoDetails(url);
    const archiveUrl = `${baseUrl}/api/v1/repos/${owner}/${name}/archive/${
      ref ?? repoDetails.repo.default_branch
    }.tar.gz`;

    const response = await this.fetchResponse(archiveUrl, {
      method: 'GET',
      ...getGiteaRequestOptions(config),
      signal: options?.signal as any,
    });

    return await this.deps.treeResponseFactory.fromTarArchive({
      stream: response.body as unknown as Readable,
      subpath: path.join('/'),
      etag: repoDetails.commitSha,
      filter: options?.filter,
    });
  }

  search(): Promise<SearchResponse> {
    throw new Error('GiteaUrlReader search not implemented.');
  }

  toString() {
    const { host } = this.integration.config;
    return `gitea{host=${host},authed=${Boolean(
      this.integration.config.password,
    )}}`;
  }

  private async getRepoDetails(url: string): Promise<{
    commitSha: string;
    repo: {
      default_branch: string;
    };
  }> {
    const config = this.integration.config;
    const baseUrl = config.baseUrl ?? `https://${config.host}`;
    const apiBaseUrl = `${baseUrl}/api/v1`;
    const [_blank, owner, name, _src, _branch, ref] = url
      .replace(baseUrl, '')
      .replace(/.git$/, '')
      .split('/');

    const repo = await this.fetchJson(
      `${apiBaseUrl}/repos/${owner}/${name}`,
      getGiteaRequestOptions(this.integration.config),
    );

    const lastCommit = await this.fetchJson(
      `${apiBaseUrl}/repos/${owner}/${name}/commits?sha=${
        ref ?? repo.default_branch
      }&stat=false&limit=1`,
      getGiteaRequestOptions(this.integration.config),
    );

    return {
      repo: repo,
      commitSha: lastCommit.sha,
    };
  }

  private async fetchResponse(
    url: string | URL,
    init: RequestInit,
  ): Promise<Response> {
    const urlAsString = url.toString();

    const response = await fetch(urlAsString, init);

    if (!response.ok) {
      const message = `Request failed for ${urlAsString}, ${response.status} ${response.statusText}`;
      if (response.status === 404) {
        throw new NotFoundError(message);
      }
      throw new Error(message);
    }

    return response;
  }

  private async fetchJson(url: string | URL, init: RequestInit): Promise<any> {
    const response = await this.fetchResponse(url, init);
    return await response.json();
  }
}
