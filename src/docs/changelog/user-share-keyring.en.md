# User share notifications and secure unlocking

## User shares notify recipients

Sharing an item with Cognis users now sends a Share-category notification through each recipient's configured notification preferences. The notification opens the shared item directly.

## Passwords stay encrypted in a keyring

Password-protected user shares prompt recipients to unlock the item once and save the verified password in a browser keyring encrypted from their login password. Components access entries through named keyring capabilities rather than plaintext storage.

## Relocking is configurable

Security settings now let users keep the keyring unlocked until logout or automatically relock it after a selected period. Read-only and read-write permissions continue to govern the shared component data.
