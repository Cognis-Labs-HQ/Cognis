# PR Changelog — Make Ctx the Capability Backbone

## Summary

Shifted core API route wiring and several gateway/adapter bootstrap paths toward
ctx-backed capability access.

Auth helpers are now exposed through a route context capability so API route
factories and module extension routing no longer import auth gateway internals
directly. Gateway and adapter bootstrap code now prefers ctx capability lookups
for DB access and related cross-component wiring.

## Changed Components and Files

- Core/API capability and route context wiring:
    - `src/core/services/gateway-service.ts`
    - `src/api/reuse/route-context.ts`
    - `src/api/server.ts`
    - `src/api/main.ts`
    - `src/modules/routes/module-extensions.ts`
- API route factories moved to injected route context:
    - `src/api/routes/search/index.ts`
    - `src/api/routes/modules/index.ts`
    - `src/api/routes/gateways/index.ts`
    - `src/api/routes/system/index.ts`
    - `src/api/routes/users/index.ts`
    - `src/api/routes/ui/index.ts`
- Gateway/adapter ctx capability cleanup:
    - `src/gateways/auth/bootstrap.ts`
    - `src/gateways/db/bootstrap.ts`
    - `src/gateways/notify/bootstrap.ts`
    - `src/gateways/notify/gateway.ts`
    - `src/gateways/registration/bootstrap.ts`
    - `src/gateways/social/bootstrap.ts`
    - `src/gateways/study/bootstrap.ts`
    - `src/adapters/notify/internal/index.ts`
    - `src/adapters/social/messages/index.ts`
    - `src/adapters/social/profile/index.ts`
    - `src/adapters/study/classes/index.ts`
- Instructions and version tracking:
    - `.github/copilot-instructions.md`
    - `src/api/gateway-bootstrap.ts`
    - `src/docs/versions.en.md`

## Commits

- [feb1bbc](https://github.com/le-firehawk/Cognis/commit/feb1bbc)
