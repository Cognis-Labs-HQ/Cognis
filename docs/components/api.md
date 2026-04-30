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


## API auth model
- API authorization uses **opaque bearer access tokens** only (no JWT bearer tokens for API routes).
- Obtain a token with `POST /api/v1/auth/login`; response includes `data.token`.
- Send tokens as `Authorization: Bearer <token>`.
- Login also sets `cognis_access_token` as an HttpOnly cookie for server-rendered UI route guards.
- Token expiry is controlled by `COGNIS_ACCESS_TOKEN_TTL_SECONDS` (default: `43200`, 12 hours).
- API startup mints a non-expiring CLI bootstrap token at `/var/run/cognis/cli-access.token` (permission mode `0600`) for trusted local CLI usage.
