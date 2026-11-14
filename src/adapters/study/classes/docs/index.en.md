# Classes Adapter

The Classes adapter owns language-specific classes, membership requests, teacher assignments and classroom preferences.

## Usage examples

Teachers use `/classes` to manage their classes; signed-in learners use `/my-classes` to view their memberships. `GET /api/v1/study/classes?language=ja` returns the teacher’s matching classes, while `GET /api/v1/study/my-classes` returns the learner’s enrolled classes.

## Technical specification

### Routes and permissions

The adapter registers its routes and persistence through the Study gateway and ctx. Teacher-scoped routes require the teacher role; teacher-request approval and rejection require an administrator. Class membership and classroom changes retain their account and class authorization checks.

### Account deletion receipts

During `deprovision-user` → `cleanup-dependencies`, the component resolves `auth:deprovisionOutcome` version 1 through `system:contracts` and calls `deletedAccount(input, stageResults)` with the original objects from that invocation. Only an Auth-owned receipt confirming a committed deletion authorizes removal of the account's memberships, teacher assignments and classroom activity. Copied results, disable/archive outcomes, and missing or unavailable receipts do not authorize this cleanup.

Deploy with the bundled Auth 2.2.12 provider or an alternative implementing this versioned contract; mutable public flow results are not a fallback. Cleanup uses the committed receipt rather than reauthorizing after deletion. An external mutation already started may partially complete before a later failure; cross-component rollback is not guaranteed. Normal UI controls and tutorials are unchanged.

This migration protects the bundled cleanup consumers. Before enabling account deletion in a deployment, update or disable external cleanup hooks that still trust mutable public flow results.
