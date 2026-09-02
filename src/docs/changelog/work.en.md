# Flexible Study Library

## Define the relationship framework redesign

Added a staged implementation plan for replacing fixed Library layers with consumer-owned schemas, enforced generic relationships, pluggable resolution and lookup flows, complete entry-detail UI, deep links, and reversible migration.

## Execute the redesign

Replaced fixed layers with persisted, versioned consumer schemas; enforced typed fields, cardinality, ordered edges, schema versions, and visible relationship targets; and added Unicode grapheme resolution plus removable, provenance-aware lookup providers.

## Complete relationship browsing

Added provider-neutral schema, detail, trace, resolution, and lookup APIs. The schema-driven Library UI now browses arbitrary layers and opens reload-safe details showing fields, components, and incoming usage through the Study gateway client.

## Breaking capability change

The Library adapter is now version 2.0.0. Consumers must register a schema and identify its schema and relationship IDs instead of using the removed fixed layer catalogue, template cloning, or layer-specific import and export methods.

## Commits

- [2db6fd1a](https://github.com/Cognis-Labs-HQ/Cognis/commit/2db6fd1a147194de35f45b07090d0b5356206933)
- [45c1c7e0](https://github.com/Cognis-Labs-HQ/Cognis/commit/45c1c7e011bfde255e69e0dcf87b01e95600c49a)
