import {
  DEFAULT_NAMESPACE,
  stringifyEntityRef,
} from '@backstage/catalog-model';

import {
  createRouter,
  providers,
  // defaultAuthProviderFactories,
} from '@backstage/plugin-auth-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  return await createRouter({
    logger: env.logger,
    config: env.config,
    database: env.database,
    discovery: env.discovery,
    tokenManager: env.tokenManager,
    providerFactories: {
      // ...defaultAuthProviderFactories,

      //
      //   https://backstage.io/docs/auth/identity-resolver
      github: providers.github.create({
        signIn: {
          async resolver({ result: { fullProfile } }, ctx) {
            const userId = fullProfile.username;
            if (!userId) {
              throw new Error(
                `GitHub user profile does not contain a username`,
              );
            }

            const userEntityRef = stringifyEntityRef({
              kind: 'User',
              name: userId,
              namespace: DEFAULT_NAMESPACE,
            });

            return ctx.issueToken({
              claims: {
                sub: userEntityRef,
                ent: [userEntityRef],
              },
            });
          },
          /* resolver: providers.github.resolvers.usernameMatchingUserEntityName(),*/
        },
      }),
      oauth2Proxy: providers.oauth2Proxy.create({
        signIn: {
          async resolver({ result }, ctx) {
            console.log("Sign in with oauth2");
            const name = result.getHeader('x-forwarded-preferred-username');
            if (!name) {
              throw new Error('Request did not contain a user');
            }
            try {
              // Attempts to sign in existing user
              const signedInUser = await ctx.signInWithCatalogUser({
                entityRef: { name },
              });

              return Promise.resolve(signedInUser);
            } catch (e) {
              // Create stub user
              const userEntityRef = stringifyEntityRef({
                kind: 'User',
                name: name,
                namespace: DEFAULT_NAMESPACE,
              });
              return ctx.issueToken({
                claims: {
                  sub: userEntityRef,
                  ent: [userEntityRef],
                },
              });
            }
            /* return ctx.signInWithCatalogUser({
              entityRef: { name },
            }); */
          },
        },
      }),
      gitea: providers.oauth2.create({
        signIn: {
          resolver(info, ctx) {
            console.log(info.profile);
            const userRef = stringifyEntityRef({
              kind: 'User',
              name: (info.profile.displayName = 'unknown'),
              namespace: DEFAULT_NAMESPACE,
            });
            return ctx.issueToken({
              claims: {
                sub: userRef, // The user's own identity
                ent: [userRef], // A list of identities that the user claims ownership through
              },
            });
          },
        },
      }),
    },
  });
}
