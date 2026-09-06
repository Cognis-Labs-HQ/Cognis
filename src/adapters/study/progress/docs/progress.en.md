# Learning Progress

The Progress adapter records append-only, idempotent learning events and derives rebuildable learner projections. Each event identifies its actor, canonical content and revision, activity and scope, attempt result, hint use, duration, completion state, and bounded metadata.

## Privacy and authorization

The service checks actor ownership before reading or writing. Administrators and owners may inspect another actor; classroom operations also require the Classes access capability. Routes cannot bypass these checks.

## Capability and flow

`study:progress` provides event recording, compensating corrections, queries, aggregation, and projection rebuilding. `study:progress:recordEvent` exposes `authorize`, `validate`, `observe`, `persist`, and `project` stages for neutral extensions.

## HTTP API

Authenticated clients use `/api/v1/study/progress/events`, `/projections`, and `/aggregate`. Administrators can invoke `/rebuild`. Query filters support actor, schema, layer, language, activity, interest vein, classroom, event ID, and inclusive `from`/`until` timestamps. No result limit is imposed.

Corrections append an event with `compensatesEventId`; stored history is never rewritten. Metadata must be a small JSON object and prototype-manipulation keys are rejected.
