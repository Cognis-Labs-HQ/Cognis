# Reliable private module discovery

**Feature Branch:** feature-fix-private-repo-visibility-in-module-marketplace

## Private repository scanning survives restarts

The Cognis Labs HQ marketplace source now persists its private-repository scan setting as part of the default source record, so configured private modules remain discoverable after the server restarts.

## Background scans no longer unlock the keyring

Automatic marketplace polling now performs authenticated source discovery and reads a PAT only when the keyring is already unlocked. The keyring resolver still validates cached credentials and removes invalid values without unexpectedly prompting for the account keyring password; an explicit refresh can still request access.

## Every accessible private repository is considered

Private discovery no longer restricts GitHub's authenticated repository list by affiliation, which could omit explicitly granted fine-grained PAT repositories. Scan logs now distinguish catalog results from installed modules and identify repositories rejected because of invalid manifests or enrichment failures.

## Source settings use persistent container storage

Production containers now write marketplace source records to the mounted configuration volume instead of a path beneath the replaceable server build. The record retains the private-scan switch and the identifier that resolves the PAT from the user's encrypted, server-synchronized keyring after a restart.

## Commits

- [2d31b43](https://github.com/Cognis-Labs-HQ/Cognis/commit/2d31b43565ee1b05d00301b9ed1faaf99a8a6f89)
