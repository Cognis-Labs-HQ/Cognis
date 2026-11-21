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

## Security

Authenticated ownership and classroom membership are checked by each operation. Administrative approval is required where teacher or join policy requires it.

## Reference

### Technical Specification

| Page / surface             | Guide         | Access         |
| -------------------------- | ------------- | -------------- |
| `/classes` · `#class-list` | Classes Guide | Signed-in user |
| `/my-classes`              | My Classes    | Signed-in user |

See the [shared contract](/docs/adapters/social/messages/technical) for this behavior.
