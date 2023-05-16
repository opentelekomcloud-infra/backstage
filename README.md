# [Backstage](https://backstage.io)

This is your newly scaffolded Backstage App, Good Luck!

To start the app, run:

```sh
yarn install
yarn dev
```

To build container, run:
```sh
yarn tsc
yarn build:backend
podman image build . -f packages/backend/Dockerfile --tag gitea.eco.tsi-dev.otc-service.com/backstage/backstage:$TAG
```

# Update

For updating dependencies execute:

```sh
yarn backstage-cli versions:bump --pattern '@{backstage,roadiehq,janus-idp,k-phoen,trimm,mdude2314}/*'
```
