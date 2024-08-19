# syntax=docker/dockerfile:1.2

# Stage 1 - Create yarn install skeleton layer
FROM node:20-bookworm-slim AS packages

WORKDIR /app

# Set up Yarn 3.5
RUN corepack enable && \
    corepack prepare yarn@3.5.0 --activate

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn

COPY packages packages

# Comment this out if you don't have any internal plugins
COPY plugins plugins

RUN find packages \! -name "package.json" -mindepth 2 -maxdepth 2 -exec rm -rf {} \+

# Stage 2 - Install dependencies and build packages
FROM node:20-bookworm-slim AS build

# Install isolate-vm dependencies, these are needed by the @backstage/plugin-scaffolder-backend.
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 g++ git build-essential && \
    corepack enable && \
    corepack prepare yarn@3.5.0 --activate

# Install sqlite3 dependencies. You can skip this if you don't use sqlite3 in the image,
# in which case you should also move better-sqlite3 to "devDependencies" in package.json.
RUN apt-get update && \
    apt-get install -y --no-install-recommends libsqlite3-dev

USER node
WORKDIR /app

COPY --from=packages --chown=node:node /app .

ENV CYPRESS_CACHE_FOLDER /app/cypress_cache
RUN mkdir -p /app/cypress_cache && chown -R node:node /app/cypress_cache

RUN yarn install --immutable

COPY --chown=node:node . .

RUN yarn postinstall

RUN yarn tsc
RUN yarn build:backend

RUN mkdir packages/backend/dist/skeleton packages/backend/dist/bundle \
    && tar xzf packages/backend/dist/skeleton.tar.gz -C packages/backend/dist/skeleton \
    && tar xzf packages/backend/dist/bundle.tar.gz -C packages/backend/dist/bundle

# Stage 3 - Build the actual backend image and install production dependencies
FROM node:20-bookworm-slim

# Install isolate-vm dependencies, these are needed by the @backstage/plugin-scaffolder-backend.
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 g++ build-essential && \
    corepack enable && \
    corepack prepare yarn@3.5.0 --activate

# Install sqlite3 dependencies. You can skip this if you don't use sqlite3 in the image,
# in which case you should also move better-sqlite3 to "devDependencies" in package.json.
RUN apt-get update && \
    apt-get install -y --no-install-recommends libsqlite3-dev

# From here on we use the least-privileged `node` user to run the backend.
USER node

WORKDIR /app

# Copy the install dependencies from the build stage and context
COPY --from=build --chown=node:node /app/package.json /app/yarn.lock /app/.yarnrc.yml ./
COPY --from=build --chown=node:node /app/.yarn ./.yarn
COPY --from=build --chown=node:node /app/packages/backend/dist/skeleton/ ./

RUN mkdir -p /app/cypress_cache && chown -R node:node /app/cypress_cache

RUN yarn workspaces focus

# Copy the built packages from the build stage
COPY --from=build --chown=node:node /app/packages/backend/dist/bundle/ ./

# Copy any other files that we need at runtime
COPY --chown=node:node app-config.yaml ./

# This switches many Node.js dependencies to production mode.
ENV NODE_ENV production

CMD ["node", "packages/backend", "--config", "app-config.yaml"]
