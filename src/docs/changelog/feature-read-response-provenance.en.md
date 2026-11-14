# Read Response Provenance

**Feature Branch:** feature-read-response-provenance

## Identify Client Read Sources

Managed component-declared session GET responses expose `x-cognis-read-source`: `live` for the caller starting a transport read, `shared` for a caller joining that in-flight read, and `cached` for a stored or restored result. A later fresh read is `live` even when its payload is identical. Cache consumers can observe the same successful-read outcome through the optional `onSource` callback without changing returned values.

## Preserve Read Boundaries

These values describe the client read outcome, not a server revision, a guarantee that data is current, or an authorization decision. Existing ownership, account/session and access checks still apply. Response payloads, cache scheduling and bypass/error behavior remain unchanged apart from the additive marker. Aborting an owner releases its snapshots and prevents pending reads from publishing results.

Undeclared requests, guest credentials, explicit Authorization headers and `bufferOffline: false` bypasses return the original Response unchanged. Status-zero error or opaque Responses also pass through unchanged without an added marker. Managed HTTP error subscribers receive independent body streams.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/2413fc3523639f7c61d260ef13668decc09703b5
