# Fix Non-Existent Logout Endpoint

## Summary

The `POST /api/v1/auth/logout` endpoint was returning 404 for all requests. The
logout handler existed only in the legacy `routes/index.ts` file (`createAuthRoutes`),
which was never registered. The active route handler, `createAuthGatewayRoutes`
in `bootstrap.ts`, was missing the logout case entirely.

The fix adds the logout endpoint directly to `createAuthGatewayRoutes`. On
logout the handler revokes the cookie token and any Bearer token supplied in the
`Authorization` header, clears the `cognis_access_token` cookie, and logs the
event at `info` level.

## Changed Files / Components

- `src/gateways/auth/bootstrap.ts` — added `POST /api/v1/auth/logout` route to
  `createAuthGatewayRoutes`; imported `revokeAccessToken` from `access-tokens.js`

## Commit Links

- https://github.com/le-firehawk/Cognis/commit/79bc1e7242a82f3f6a3b15c0210cdf32ef752893
