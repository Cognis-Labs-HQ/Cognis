# Reliable UI asset loading

## Asset errors are no longer cached

The web proxy and API now prevent missing fingerprinted JavaScript and CSS responses from being cached as immutable assets. Clients can recover cleanly after a deployment overlap instead of retaining a JSON 404 response for an asset URL.

## Login page rendering is restored

The page composer now supplies its element renderer to every layout path, preventing the login page from failing with a `renderElementContent is not defined` error before its styles and content finish loading.

## Stable container startup is restored

The proven Docker workflow is restored: `setup.sh` generates isolated application and web environment files, the Cognis entrypoint validates configuration, compiles `DATABASE_URL`, logs lifecycle events, and forwards shutdown signals. The `cognis-web` image remains available as a separate cache and TLS boundary without changing the established application startup contract.
