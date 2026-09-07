# Versioned language schemas

**Feature Branch:** feature-extend-language-package-and-library-schemas

## Neutral package contracts

External language packages can define immutable schemas with arbitrary layers, localized typed metadata, semantic roles, relationship constraints, rendering hints, activity discovery tags, interest veins, and optional stroke assets without embedding language records in Cognis core.

## Deterministic atomic ingestion

Package preflight now validates identity, semantic versions, licenses, safe paths, namespace ownership, schemas, complete record graphs, and referenced assets before a transaction writes any content.

## Review hardening

Localized schema labels now render in the Library browser, complete semantic versions are accepted, deletion behavior is required by the type contract, package assets remain retrievable after ingestion, and the gateway package dependency ceiling is synchronized.

## Library navigation

The app router now gives adapter-registered Study pages precedence over the generic language-child fallback, so selecting Library mounts the Library page instead of silently rejecting navigation.

## Reliable schema listing

Library schema listing now clones each schema explicitly, avoiding the accidental `Array.map` index argument that runtimes interpreted as invalid `structuredClone` options.

## Review safeguards

Authenticated assets now prohibit shared caching, deletion policies are validated against the contract, locale keys are canonicalized during label lookup, and core routing uses neutral fallback and navigation metadata instead of a Study-specific route branch.

## Commits

- [c1cb3240](https://github.com/Cognis-Labs-HQ/Cognis/commit/c1cb3240)
- [1325c06a](https://github.com/Cognis-Labs-HQ/Cognis/commit/1325c06a)
- [a28869ed](https://github.com/Cognis-Labs-HQ/Cognis/commit/a28869ed)
- [22cee541](https://github.com/Cognis-Labs-HQ/Cognis/commit/22cee541)
- [3d440d68](https://github.com/Cognis-Labs-HQ/Cognis/commit/3d440d68)
