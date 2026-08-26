# Reliable private module discovery

## Private repository scanning survives restarts

The Cognis Labs HQ marketplace source now persists its private-repository scan setting as part of the default source record, so configured private modules remain discoverable after the server restarts.

## Background scans no longer unlock the keyring

Automatic marketplace polling reads a PAT only when the keyring is already unlocked. Provider authentication failures are reported without unexpectedly prompting for the account keyring password; an explicit refresh can still request access.
