# Reliable UI asset loading

## Asset errors are no longer cached

The web proxy and API now prevent missing fingerprinted JavaScript and CSS responses from being cached as immutable assets. Clients can recover cleanly after a deployment overlap instead of retaining a JSON 404 response for an asset URL.

## Login page rendering is restored

The page composer now supplies its element renderer to every layout path, preventing the login page from failing with a `renderElementContent is not defined` error before its styles and content finish loading.

## The web proxy follows app container replacements

Nginx now discovers the active container runtime's DNS resolver and uses it to refresh the Cognis application address. Public requests no longer remain connected to a replaced application container, whether Cognis runs with Docker, Kubernetes, Podman, or another container platform.
