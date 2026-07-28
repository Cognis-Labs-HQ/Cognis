# Share Lifecycle

## Revocation and expiry

Delivered user-share objects are removed when their share is revoked or expires, and later writes are rejected because the recipient mapping is no longer active.

## Calendar behavior

User-share permission badges follow the selected access mode before creation. Shared calendar names allow a local 30-character name while preserving the immutable shared-by suffix. Responses to events already stored in a shared calendar update that global event instead of importing a duplicate.
