import {
  ScmIntegrationsApi,
  scmIntegrationsApiRef,
  ScmAuth,
} from '@backstage/integration-react';
import {
  AnyApiFactory,
  configApiRef,
  createApiFactory,
  discoveryApiRef,
} from '@backstage/core-plugin-api';

import { TechRadarClient } from './lib/tech_radar';
import { techRadarApiRef } from '@backstage/plugin-tech-radar';

import { cicdStatisticsApiRef } from '@backstage/plugin-cicd-statistics';
import { CicdStatisticsApiZuul } from '@internal/backstage-plugin-cicd-statistics-module-zuul';


export const apis: AnyApiFactory[] = [
  createApiFactory({
    api: scmIntegrationsApiRef,
    deps: { configApi: configApiRef },
    factory: ({ configApi }) => ScmIntegrationsApi.fromConfig(configApi),
  }),
  ScmAuth.createDefaultApiFactory(),
  createApiFactory({
    api: cicdStatisticsApiRef,
    deps: { configApi: configApiRef, discoveryApi: discoveryApiRef },
    factory({discoveryApi}) {
      return new CicdStatisticsApiZuul({discoveryApi});
    },
  }),
  createApiFactory(techRadarApiRef, new TechRadarClient()),
];
