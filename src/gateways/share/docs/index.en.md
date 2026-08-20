# Share browser client

The Share browser client lets modules retrieve the current authenticated share-guest profile through the Share gateway's public browser contract.

## Usage examples

Import `uiCtx`, require `share:uiClient`, and call `getGuestProfile()`. Inspect the returned `Response` before reading its `{ data }` JSON payload.

## Technical specification

The client owns `/api/v1/share/guest-profile`, returns the original `Response`, and relies on the host API client for authentication and connection handling. Its provider is active only with the Share gateway, so dependent routes must declare `share:uiClient` when they require it during mount.
