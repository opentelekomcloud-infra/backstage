import { createRouter } from '@backstage-community/plugin-adr-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  return await createRouter({
    reader: env.reader,
    cacheClient: env.cache.getClient(),
    logger: env.logger,
  });
}
