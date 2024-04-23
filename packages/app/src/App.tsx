import React from 'react';
import { /* Navigate, */ Route } from 'react-router-dom';
import { apiDocsPlugin, ApiExplorerPage } from '@backstage/plugin-api-docs';
import {
  CatalogEntityPage,
  CatalogIndexPage,
  catalogPlugin,
} from '@backstage/plugin-catalog';
import {
  CatalogImportPage,
  catalogImportPlugin,
} from '@backstage/plugin-catalog-import';
import { ScaffolderPage, scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { orgPlugin } from '@backstage/plugin-org';
import { SearchPage } from '@backstage/plugin-search';
import { TechRadarPage } from '@backstage-community/plugin-tech-radar';
import {
  DefaultTechDocsHome,
  TechDocsIndexPage,
  /*  techdocsPlugin,*/
  TechDocsReaderPage,
} from '@backstage/plugin-techdocs';
/* import { TechDocsAddons } from '@backstage/plugin-techdocs-react';
import { ReportIssue } from '@backstage/plugin-techdocs-module-addons-contrib'; */
import { UserSettingsPage } from '@backstage/plugin-user-settings';
// import { UserSettingsPage } from '@internal/plugin-user-settings';
import { giteaOauth2AuthApiRef, apis } from './apis';
import { entityPage } from './components/catalog/EntityPage';
import { searchPage } from './components/search/SearchPage';
import { Root } from './components/Root';

import { AlertDisplay, OAuthRequestDialog } from '@backstage/core-components';
import { createApp } from '@backstage/app-defaults';
import { AppRouter, FlatRoutes } from '@backstage/core-app-api';
import { CatalogGraphPage } from '@backstage/plugin-catalog-graph';
import { RequirePermission } from '@backstage/plugin-permission-react';
import { catalogEntityCreatePermission } from '@backstage/plugin-catalog-common/alpha';

import {
  configApiRef,
  githubAuthApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { SignInPage, ProxiedSignInPage } from '@backstage/core-components';
import { ExplorePage /* , explorePlugin */ } from '@backstage-community/plugin-explore';

import { HomepageCompositionRoot } from '@backstage/plugin-home';
import { homePage } from './components/home/HomePage';

import * as plugins from './plugins';

const app = createApp({
  apis,
  plugins: Object.values(plugins),
  components: {
    SignInPage: props => {
      const configApi = useApi(configApiRef);
      if (configApi.getString('auth.environment') === 'development') {
        return (
          <SignInPage
            {...props}
            auto
            providers={[
              {
                id: 'github-auth-provider',
                title: 'GitHub',
                message: 'Sign in using GitHub',
                apiRef: githubAuthApiRef,
              },
              {
                id: 'gitea-auth-provider',
                title: 'Gitea',
                message: 'Sign in using Gitea',
                apiRef: giteaOauth2AuthApiRef,
              },
            ]}
          />
        );
      }
      return <ProxiedSignInPage {...props} provider="oauth2Proxy" />;
    },
  },
  bindRoutes({ bind }) {
    bind(catalogPlugin.externalRoutes, {
      createComponent: scaffolderPlugin.routes.root,
      /* viewTechDoc: techdocsPlugin.routes.docRoot, */
    });
    bind(apiDocsPlugin.externalRoutes, {
      registerApi: catalogImportPlugin.routes.importPage,
    });
    bind(scaffolderPlugin.externalRoutes, {
      registerComponent: catalogImportPlugin.routes.importPage,
    });
    bind(orgPlugin.externalRoutes, {
      catalogIndex: catalogPlugin.routes.catalogIndex,
    });
  },
});

const routes = (
  <FlatRoutes>
    <Route path="/" element={<HomepageCompositionRoot />}>
      {homePage}
    </Route>
    ;
    <Route path="/catalog" element={<CatalogIndexPage />} />
    <Route
      path="/catalog/:namespace/:kind/:name"
      element={<CatalogEntityPage />}
    >
      {entityPage}
    </Route>
    <Route path="/create" element={<ScaffolderPage />} />
    <Route path="/api-docs" element={<ApiExplorerPage />} />
    <Route path="/docs" element={<TechDocsIndexPage />}>
      <DefaultTechDocsHome />
    </Route>
    <Route
      path="/docs/:namespace/:kind/:name/*"
      element={<TechDocsReaderPage />}
    />
    <Route
      path="/tech-radar"
      element={<TechRadarPage width={1500} height={800} />}
    />
    <Route
      path="/catalog-import"
      element={
        <RequirePermission permission={catalogEntityCreatePermission}>
          <CatalogImportPage />
        </RequirePermission>
      }
    />
    <Route path="/search" element={<SearchPage />}>
      {searchPage}
    </Route>
    <Route path="/settings" element={<UserSettingsPage />} />
    <Route path="/catalog-graph" element={<CatalogGraphPage />} />
    <Route path="/explore" element={<ExplorePage />} />
  </FlatRoutes>
);

export default app.createRoot(
  <>
    <AlertDisplay />
    <OAuthRequestDialog />
    <AppRouter>
      <Root>{routes}</Root>
    </AppRouter>
  </>,
);
