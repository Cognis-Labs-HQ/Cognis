# API Component

## Purpose
`api/` exposes HTTP endpoints that map explicit business intent to core services.

## Current routes
- `POST /api/v1/modules/:id/enable`
- `POST /api/v1/modules/:id/disable`
- `GET /api/v1/system/health`
- `GET /api/v1/docs`
- `GET /api/v1/docs/:slug`

## Rules
- Endpoints stay thin: parse request, call core service, return stable envelope.
- No route should directly invoke provider-specific SDKs.
