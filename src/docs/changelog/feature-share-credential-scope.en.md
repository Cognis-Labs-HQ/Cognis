# Scope Shared Credentials

**Feature Branch:** feature-share-credential-scope

## Account and Guest Boundaries

Ordinary account guards accept only verified session-purpose credentials. Guest-aware resource handlers explicitly validate the current Share grant, then enforce their resource and capability permissions. Shared Calendar events, delegated chat, guest Keyrings and read-only Flashcards retain scoped access.

## Verified Session Identity

Auth and Share browser flows classify verified credentials rather than account-name prefixes or storage markers. Personal Study activity, Profile availability and offline delivery preserve legitimate prefixed accounts and their existing guest restrictions. Late authentication work cannot replace a newer session.

## Commits

- [d4ce81f358beccf5b559295be48b4f0ee0cc2408](https://github.com/Cognis-Labs-HQ/Cognis/commit/d4ce81f358beccf5b559295be48b4f0ee0cc2408)
- [1a2d25e7dc0ef6f19225f5e6cd5ccc65fcb74897](https://github.com/Cognis-Labs-HQ/Cognis/commit/1a2d25e7dc0ef6f19225f5e6cd5ccc65fcb74897)
- [0deea1701af7b4b1ca9da660a6ab299200125d0c](https://github.com/Cognis-Labs-HQ/Cognis/commit/0deea1701af7b4b1ca9da660a6ab299200125d0c)
