# API Component

## Purpose
`api/` exposes HTTP endpoints that map explicit business intent to core services.

## Design principles
1. **Thin route handlers**: parse -> validate -> delegate -> respond.
2. **Stable response envelopes**: `{ data }` for success, `{ error }` for failure.
3. **Gateway-first integration**: route layer never speaks provider SDK directly.

## Route groups

### System
- `GET /api/v1/system/health`
- `GET /api/v1/system/healthcheck`
- `GET /api/v1/system/ui-config`

### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

### Modules
- `POST /api/v1/modules/:id/enable`
- `POST /api/v1/modules/:id/disable`

### Docs
- `GET /api/v1/docs`
- `GET /api/v1/docs/:slugOrTreePath`

## Error response shape
```json
{
  "error": {
    "code": "forbidden",
    "message": "Requires admin scope"
  }
}
```
