# Changelog — Expand ctx flows

## Summary

The `ctx` flow system is now the exclusive path for user provisioning,
message delivery, and meeting creation. Legacy direct-store fallbacks have been
removed from these routes; the API returns 503 when required flows are
unavailable rather than silently falling back to unorchestrated code paths.

All secondary gateways (TFA, registration, study, calendar, notify) now
register `bootstrap-platform/register-flows` hooks so they participate in the
bootstrap flow when the auth gateway is present. Each registration is guarded
with `hasFlow` so isolated test environments continue to work without the full
gateway stack.

The social gateway's `validate-message` hook has been updated to validate
encrypted content fields (`ciphertext` and `iv`) instead of the plaintext
`content` field, matching the actual wire format.

The messages adapter now registers `persist-message` and `fan-out` hooks into
the `send-message` flow. The room-routes send handler delegates entirely to
this flow and reads the persisted message from the stage result.

The Jitsi Meet module now registers all MEETINGS flow catalog entries and adds
hooks for `construct-meetings-ui/resolve-providers` and
`create-meeting/validate-request`.

The deprovision-user route now reads `revokedTokenCount` from the
`cleanup-dependencies` stage result and checks the `authorize-request` stage
result for authorization failures (403).

## Changed files/components

- `src/api/routes/users/index.ts`
- `src/gateways/notify/bootstrap/index.ts`
- `src/gateways/tfa/bootstrap/index.ts`
- `src/gateways/registration/bootstrap/index.ts`
- `src/gateways/social/bootstrap.ts`
- `src/gateways/study/bootstrap.ts`
- `src/gateways/calendar/bootstrap/index.ts`
- `src/modules/jitsi-meet/bootstrap.js`
- `src/adapters/social/messages/index.ts`
- `src/adapters/social/messages/routes/shared.ts`
- `src/adapters/social/messages/routes/room-routes.ts`
- `src/api/tests/users/user-routes.test.ts`
- `src/adapters/social/messages/tests/routes-notifications.test.ts`
