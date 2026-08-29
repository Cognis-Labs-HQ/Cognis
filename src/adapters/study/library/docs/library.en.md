# Library Adapter

## Purpose

The Library adapter stores reusable, traceable learning and activity materials in the database. Every entry belongs to a fixed layer and to a global, class, or user scope. Empty layers are omitted by the UI, but the layer catalogue itself cannot be changed.

## Standard layers

The ordered layers are `alphabet`, `alt_characters`, `definitions`, `words`, `sentences`, `exercises`, `workouts`, `routines`, and `collections`. Alphabet and definition entries are roots. Higher layers reference only meaningful lower building blocks: words use writing units and definitions; sentences use words and definitions; exercises use language material; workouts use exercises; routines use exercises or workouts; and collections can group any non-collection layer.

## Access control

Everyone can read global data. Only admins and owners can create global entries or perform JSON imports. A class is readable by its teacher and active members, while only its teacher, admins, and owners can write it. A user's scope is private to that account. Push requests target a class or global scope and never bypass destination review.

## Capability and formats

The `study:library` ctx capability provides `list`, `read`, `create`, `trace`, `requestPush`, `importJson`, `exportJson`, and `exportAnki`. JSON imports use `{ "entries": [...] }`, validate every entry through the same layer, size, reference, and ACL rules as individual writes, and are limited to 10,000 entries per request. JSON exports include the schema version and immutable layer catalogue. Anki export produces UTF-8 tab-separated text suitable for importing as notes.

## Deep links

References are stored as directed edges with a relation and position. `trace` returns the requested entry and all visible entries that directly use it. Repeating trace queries walks the graph from an alphabet unit through words and sentences into later material without exposing entries outside the caller's scopes.

When a word is entered without explicit references, Cognis normalizes it to Unicode NFC, segments it into Unicode code points, resolves matching alphabet entries, and creates missing alphabet entries in the same scope. Sentences and later layers require explicit existing references; clients can batch word creation before sentence creation.
