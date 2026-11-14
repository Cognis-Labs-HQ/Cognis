# Scope Shared Credentials

**Feature Branch:** feature-share-credential-scope

## Account and Guest Boundaries

Ordinary account guards accept only verified session-purpose credentials. Guest-aware resource handlers explicitly validate the current Share grant, then enforce their resource and capability permissions. Shared Calendar events, delegated chat, guest Keyrings and read-only Flashcards retain scoped access.

## Verified Session Identity

Auth and Share browser flows classify verified credentials rather than account-name prefixes or storage markers. Personal Study activity, Profile availability and offline delivery preserve legitimate prefixed accounts and their existing guest restrictions. Late authentication work cannot replace a newer session.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/92f8b7563953593f39d1844f0abd590478dd007f
