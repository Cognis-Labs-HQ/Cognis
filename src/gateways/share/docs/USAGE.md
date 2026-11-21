# Usage

Practical procedures for Sharing.

## Prerequisites

The content owner must permit sharing and an appropriate sharing method must be enabled.

## Examples

Choose Link or User, review permissions and protection, save, then test access as the recipient. Revoke an obsolete share after confirmation.

```sh
cognisctl share:tokens --help
cognisctl share:resolve --help
cognisctl share:recipients:users --help
cognisctl share:approvals:pending --help
```

Import `uiCtx`, require `share:uiClient`, and call `getGuestProfile()`. Inspect the returned `Response` before reading its `{ data }` JSON payload.

## Expected Results

Recipients receive only the declared resource access; guest sessions do not become ordinary account sessions.

## Troubleshooting

Check expiry, password, recipient and current resource access. Revocation removes delegated access even if an old link remains visible elsewhere.
