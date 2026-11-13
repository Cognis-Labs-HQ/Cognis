# Core and API Type Contracts

**Feature Branch:** feature-core-api-type-contracts

## Typed Public Contracts

Unify access roles, declare module capability requirements and account identifiers, and preserve typed component metadata. Keep lifecycle capability lookup and directory discovery aligned with their runtime contracts.

Namespace access lists accept readonly component IDs, preserving the Files gateway’s immutable registry entries. Flow result helpers accept an undefined stage-results collection and return null, matching their existing runtime behavior.

## Typed API Fixtures

Use complete module fixtures, registered capability stores and an API-owned document database fixture. Repair account provisioning test roles and source credential receipts without changing route payloads.

## Versions

Advance Core to 0.6.3 and API to 0.13.32, with matching workspace lock entries and Core dependency ceilings.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/9a3a52bd4b0ad3c1de469f4bf18950095325dc63
- https://github.com/Cognis-Labs-HQ/Cognis/commit/8269301ee7fe4e332adc2d66b9f6a7c4d98a4253
