# Technical Reference

The public interfaces and operational rules of Classes.

## Interfaces

`GET /api/v1/study/classes`

`GET /api/v1/study/my-classes`

`GET /api/v1/study/available-classes`

`GET /api/v1/study/preferences`

`PUT /api/v1/study/preferences`

`POST /api/v1/study/teacher-requests`

`GET /api/v1/study/teacher-requests`

`POST /api/v1/study/teacher-requests/:id/approve`

`POST /api/v1/study/teacher-requests/:id/reject`

`POST /api/v1/study/classes/:classId/join`

`DELETE /api/v1/study/classes/:classId/membership`

`GET /api/v1/study/classrooms`

`PATCH /api/v1/study/classrooms/:classId/layout`

`DELETE /api/v1/study/classrooms/:classId/students/:studentId`

`GET /api/v1/study/classes/:classId/members`

`GET /api/v1/study/classes/:classId/join-requests`

`POST /api/v1/study/classes/:classId/invite`

`POST /api/v1/study/classes/:classId/join-requests/:studentId/approve`

`POST /api/v1/study/classes/:classId/join-requests/:studentId/reject`

## Configuration

Learning languages, teacher eligibility, class membership and classroom limits are configured through Study and Classes. This adapter has no separate database connection settings.

## Behavior

Teachers manage their classes and membership decisions. Learners browse available classes, request membership and use their enrolled classrooms. State is stored through the DB gateway.

### Routes and permissions

The adapter registers its routes and persistence through the Study gateway and ctx. Teacher-scoped routes require the teacher role; teacher-request approval and rejection require an administrator. Class membership and classroom changes retain their account and class authorization checks.

### Account deletion receipts

During `deprovision-user` → `cleanup-dependencies`, the component resolves `auth:deprovisionOutcome` version 1 through `system:contracts` and calls `deletedAccount(input, stageResults)` with the original objects from that invocation. Only an Auth-owned receipt confirming a committed deletion authorizes removal of the account's memberships, teacher assignments and classroom activity. Copied results, disable/archive outcomes, and missing or unavailable receipts do not authorize this cleanup.

Deploy with the bundled Auth 2.2.12 provider or an alternative implementing this versioned contract; mutable public flow results are not a fallback. Cleanup uses the committed receipt rather than reauthorizing after deletion. An external mutation already started may partially complete before a later failure; cross-component rollback is not guaranteed. Normal UI controls and tutorials are unchanged.

This migration protects the bundled cleanup consumers. Before enabling account deletion in a deployment, update or disable external cleanup hooks that still trust mutable public flow results.

## Security

Authenticated ownership and classroom membership are checked by each operation. Administrative approval is required where teacher or join policy requires it.

## Reference

### Technical Specification

| Page / surface             | Guide         | Access         |
| -------------------------- | ------------- | -------------- |
| `/classes` · `#class-list` | Classes Guide | Signed-in user |
| `/my-classes`              | My Classes    | Signed-in user |

See the [shared contract](/docs/adapters/social/messages/technical) for this behavior.
