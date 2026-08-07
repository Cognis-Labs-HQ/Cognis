# Reliable UI asset loading

## Asset errors are no longer cached

The web proxy and API now prevent missing fingerprinted JavaScript and CSS responses from being cached as immutable assets. Clients can recover cleanly after a deployment overlap instead of retaining a JSON 404 response for an asset URL.

## Login page rendering is restored

The page composer now supplies its element renderer to every layout path, preventing the login page from failing with a `renderElementContent is not defined` error before its styles and content finish loading.

## The web proxy resolves runtime service names

Nginx now resolves the Cognis application service through the container environment's standard hostname resolution. This supports the same search domains and host mappings used by other tools in Docker, Kubernetes, Podman, and other container platforms, avoiding `no live upstreams` errors when the hostname works elsewhere in the web container.

The web proxy takes the application service hostname from `HOST` instead of assuming that the service is named `cognis`. Namespace-qualified names containing periods, such as `cognis.cognis`, are supported to prevent an empty upstream pool in Kubernetes and other deployments that use scoped service names.

## Container startup stays deployment-neutral

The application entrypoint restores structured logging and optional `DATABASE_URL` compilation from provider-specific fields before executing Cognis. Sensitive values such as `DATABASE_URL` and `DATA_ENCRYPTION_KEY` no longer have image defaults and must come from the deployment environment. The web profile now uses the generic nginx image and its native environment-substituted configuration template instead of building a Cognis-specific nginx image.
