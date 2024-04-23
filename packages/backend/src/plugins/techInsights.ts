import {
  createRouter,
  buildTechInsightsContext,
  createFactRetrieverRegistration,
  entityOwnershipFactRetriever,
  entityMetadataFactRetriever,
  //  techdocsFactRetriever,
} from '@backstage-community/plugin-tech-insights-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';
import {
  JsonRulesEngineFactCheckerFactory,
  JSON_RULE_ENGINE_CHECK_TYPE,
} from '@backstage-community/plugin-tech-insights-backend-module-jsonfc';

const ttlTwoWeeks = { timeToLive: { weeks: 2 } };

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  const techInsightsContext = await buildTechInsightsContext({
    logger: env.logger,
    config: env.config,
    database: env.database,
    discovery: env.discovery,
    tokenManager: env.tokenManager,
    scheduler: env.scheduler,
    factRetrievers: [
      createFactRetrieverRegistration({
        cadence: '0 */6 * * *', // Run every 6 hours - https://crontab.guru/#0_*/6_*_*_*
        factRetriever: entityOwnershipFactRetriever,
        lifecycle: ttlTwoWeeks,
      }),
      createFactRetrieverRegistration({
        cadence: '0 */6 * * *',
        factRetriever: entityMetadataFactRetriever,
        lifecycle: ttlTwoWeeks,
      }),
    ],
    factCheckerFactory: new JsonRulesEngineFactCheckerFactory({
      logger: env.logger,
      checks: [
        {
          id: 'groupOwnerCheck',
          type: JSON_RULE_ENGINE_CHECK_TYPE,
          name: 'Group Owner Check',
          description:
            'Verifies that a Group has been set as the owner for this entity',
          factIds: ['entityOwnershipFactRetriever'],
          rule: {
            conditions: {
              all: [
                {
                  fact: 'hasGroupOwner',
                  operator: 'equal',
                  value: true,
                },
              ],
            },
          },
        },
        {
          id: 'titleCheck',
          type: JSON_RULE_ENGINE_CHECK_TYPE,
          name: 'Title Check',
          description:
            'Verifies that a Title, used to improve readability, has been set for this entity',
          factIds: ['entityMetadataFactRetriever'],
          rule: {
            conditions: {
              all: [
                {
                  fact: 'hasTitle',
                  operator: 'equal',
                  value: true,
                },
              ],
            },
          },
        },
        {
          id: 'techDocsCheck',
          type: JSON_RULE_ENGINE_CHECK_TYPE,
          name: 'TechDocs Check',
          description:
            'Verifies that TechDocs has been enabled for this entity',
          factIds: ['techdocsFactRetriever'],
          rule: {
            conditions: {
              all: [
                {
                  fact: 'hasAnnotationBackstageIoTechdocsRef',
                  operator: 'equal',
                  value: true,
                },
              ],
            },
          },
        },
      ],
    }),
  });

  return await createRouter({
    ...techInsightsContext,
    logger: env.logger,
    config: env.config,
  });
}
