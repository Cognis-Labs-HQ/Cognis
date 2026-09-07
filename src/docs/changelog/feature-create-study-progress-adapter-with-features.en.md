# Learning Progress Events

**Feature Branch:** feature-create-study-progress-adapter-with-features

## Immutable progress tracking

Adds privacy-scoped, idempotent learning events, compensating corrections, rebuildable mastery projections, multidimensional aggregation, and a staged extension flow.

## Metadata filter groups work

Library metadata groups can now declare exclusive single-selection pills or allow multiple selections. Applying a pill immediately hides non-matching cards, including cards whose grid display styling previously overrode the `hidden` state.

## Authenticated themed audio

Library audio now loads through the authenticated Study gateway client instead of an unauthenticated native media request. Temporary media URLs are cleaned up after use, and native controls follow light and dark application themes.

## Library UI structure compliance

Moved the Library browser entry point to the required adapter `ui/app/index.js` layout and updated its runtime route and structural tests. Documentation scans now ignore generated build output, naming checks cover the moved source cleanly, and router tests reflect dynamic gateway routes and preserved navigation state.

## Repeatable content imports

PostgreSQL and MariaDB table provisioning now check for duplicate data before healing declared unique indexes, preserving module availability when existing data cannot safely become unique. Study Library entries and assets use healed conflict targets, while all-key references use conflict-ignore inserts so repeated content cannot fail on their primary key.

## Commits

- [1d65413](https://github.com/Cognis-Labs-HQ/Cognis/commit/1d65413154f89efbd91422bbfdc94bc8196e9f16)
- [656b59f](https://github.com/Cognis-Labs-HQ/Cognis/commit/656b59feef1ff344ce911a042eecae788a228cc4)
- [e183481](https://github.com/Cognis-Labs-HQ/Cognis/commit/e18348130104134eaa7962aa3020a03a22325e86)
- [ba25e44](https://github.com/Cognis-Labs-HQ/Cognis/commit/ba25e4481d6c71a35ebe2ecc8d0143b85f0125b3)
- [ef782975](https://github.com/Cognis-Labs-HQ/Cognis/commit/ef782975)
- [68bd7478](https://github.com/Cognis-Labs-HQ/Cognis/commit/68bd7478dbf6343109087bd83a9fba643452a838)
- [eeabc5e1](https://github.com/Cognis-Labs-HQ/Cognis/commit/eeabc5e1231e3de246a14ee4ff49582a7169768c)
- [2cc37134](https://github.com/Cognis-Labs-HQ/Cognis/commit/2cc371343c54afed45e545d523a751cad101be3c)
- [ad01aa56](https://github.com/Cognis-Labs-HQ/Cognis/commit/ad01aa561321b7db5982b0fbfe7f1b28ed11347b)
- [9fe9af00](https://github.com/Cognis-Labs-HQ/Cognis/commit/9fe9af0021f9a093ba432fca9761368e8df0e5f6)
- [51c727ea](https://github.com/Cognis-Labs-HQ/Cognis/commit/51c727eaeb923bd3d4a569ed9e924945f56e286c)
