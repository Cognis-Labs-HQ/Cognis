# Consistent social membership changes

## Simple membership APIs and capabilities

Chatroom members and profile followers now share a documented `POST`/`DELETE` collection convention and matching `ctx` capabilities for trusted component integrations.

## Membership capability exported to modules

The Messages adapter now publishes chatroom membership through the system `ctx` as well as the gateway capability store, allowing external modules such as Jitsi Meet to resolve it during enablement and bootstrap.

## Commits

- [a8b044c](https://github.com/Cognis-Labs-HQ/Cognis/commit/a8b044c024072a91dc63741698588d762418d0b3)
