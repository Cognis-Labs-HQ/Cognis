# Preserve profiles and stabilize encrypted conversations

## Keyring reset preserves social identity

Destroying a keyring no longer removes message-room memberships. Profile-backed social actions also recreate a missing authenticated profile before use, preventing blank actor names for accounts affected by an earlier destructive reset.

## Direct conversations are idempotent

Concurrent requests to start the same direct conversation are serialized and recheck for an existing room, preventing duplicate rooms from rapid or overlapping requests.

## Messages wait for active key loading

Concurrent room-key resolution is coordinated per room so SPA entry cannot display a stale unlock-required state while the unlocked keyring is already resolving the same room key.
