import {
  ScmIntegrationsApi,
  scmIntegrationsApiRef,
  scmAuthApiRef,
  ScmAuth,
} from '@backstage/integration-react';
import {
  AnyApiFactory,
  configApiRef,
  createApiRef,
  createApiFactory,
  discoveryApiRef,
  oauthRequestApiRef,
  githubAuthApiRef,
} from '@backstage/core-plugin-api';

import { OAuth2 } from '@backstage/core-app-api';
import {
  ApiRef,
  OAuthApi,
  OpenIdConnectApi,
  ProfileInfoApi,
  BackstageIdentityApi,
  SessionApi,
} from '@backstage/core-plugin-api';

import { TechRadarClient } from './lib/tech_radar';
import { techRadarApiRef } from '@backstage-community/plugin-tech-radar';

import { cicdStatisticsApiRef } from '@backstage-community/plugin-cicd-statistics';
import { CicdStatisticsApiZuul } from '@internal/backstage-plugin-cicd-statistics-module-zuul';

export const giteaOauth2AuthApiRef: ApiRef<
  OAuthApi &
    OpenIdConnectApi &
    ProfileInfoApi &
    BackstageIdentityApi &
    SessionApi
> = createApiRef({
  id: 'gitea-auth-provider',
});

export const apis: AnyApiFactory[] = [
  createApiFactory({
    api: scmIntegrationsApiRef,
    deps: { configApi: configApiRef },
    factory: ({ configApi }) => ScmIntegrationsApi.fromConfig(configApi),
  }),
  // ScmAuth.createDefaultApiFactory(),
  createApiFactory({
    api: scmAuthApiRef,
    deps: {
      githubAuthApi: githubAuthApiRef,
      giteaAuthApi: giteaOauth2AuthApiRef,
    },
    factory: ({ githubAuthApi, giteaAuthApi }) =>
      ScmAuth.merge(
        ScmAuth.forGithub(githubAuthApi),
        ScmAuth.forAuthApi(giteaAuthApi, {
          host: 'gitea.eco.tsi-dev.otc-service.com',
          scopeMapping: {
            default: ['read:user', 'public_repo'],
            repoWrite: ['repo'],
          },
        }),
      ),
  }),
  createApiFactory({
    api: giteaOauth2AuthApiRef,
    deps: {
      discoveryApi: discoveryApiRef,
      oauthRequestApi: oauthRequestApiRef,
      configApi: configApiRef,
    },
    factory: ({ discoveryApi, oauthRequestApi, configApi }) =>
      OAuth2.create({
        configApi,
        discoveryApi,
        oauthRequestApi,
        provider: {
          id: 'gitea',
          title: 'Gitea auth provider',
          icon: () => null,
        },
        environment: configApi.getOptionalString('auth.environment'),
        defaultScopes: ['read:user', 'repo'],
      }),
  }),
  createApiFactory({
    api: cicdStatisticsApiRef,
    deps: { configApi: configApiRef, discoveryApi: discoveryApiRef },
    factory({ discoveryApi }) {
      return new CicdStatisticsApiZuul({ discoveryApi });
    },
  }),
  createApiFactory(techRadarApiRef, new TechRadarClient()),
];
