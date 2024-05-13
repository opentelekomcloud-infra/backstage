import {
  createRouter,
  StaticExploreToolProvider,
} from '@backstage-community/plugin-explore-backend';
import { ExploreTool } from '@backstage-community/plugin-explore-common';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

// List of tools you want to surface in the Explore plugin "Tools" page.
// https://github.com/backstage/backstage/tree/master/plugins/explore-backend
const exploreTools: ExploreTool[] = [
  //  {
  //    title: 'Zuul CI-CD',
  //    description: 'Zuul CI',
  //    url: '/zuul',
  //    image: 'https://zuul-ci.org/images/logo.svg',
  //    tags: ['cicd', 'zuul'],
  //  },
];

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  return await createRouter({
    logger: env.logger,
    toolProvider: StaticExploreToolProvider.fromData(exploreTools),
  });
}
