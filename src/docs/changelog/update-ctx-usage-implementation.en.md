# PR Changelog — Make Ctx...

## Summary

Shifted core API route wiring and several gateway/adapter bootstrap paths toward
ctx-backed capability access.

Auth helpers are now exposed through a route context capability so API route
factories and module extension routing no longer import auth gateway internals
directly. Gateway and adapter bootstrap code now prefers ctx capability lookups
for DB access and related cross-component wiring.

A follow-up pass pushed ctx usage deeper into adapter routes, study language
modules, and gateway-owned UI/API routes, and documented capability
contributions more explicitly at their contributor sites. Internal workspace
package references to `@cognis/core` were also aligned so `npm install` again
resolves the local workspace package cleanly.

This update also fixes API bootstrap ordering so the CLI access token is issued
only after the auth capability has been resolved from ctx, preventing the
startup-time `ReferenceError` in `src/api/main.ts`.

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
    - `src/gateways/logging/bootstrap.ts`
    - `src/gateways/db/bootstrap.ts`
    - `src/gateways/notify/bootstrap.ts`
    - `src/gateways/notify/routes/notifications.ts`
    - `src/gateways/notify/gateway.ts`
    - `src/gateways/registration/bootstrap.ts`
    - `src/gateways/social/bootstrap.ts`
    - `src/gateways/study/bootstrap.ts`
    - `src/adapters/notify/internal/index.ts`
    - `src/adapters/notify/internal/routes.ts`
    - `src/adapters/social/messages/index.ts`
    - `src/adapters/social/messages/routes.ts`
    - `src/adapters/social/profile/index.ts`
    - `src/adapters/social/profile/routes/index.ts`
    - `src/adapters/social/profile/routes/social.ts`
    - `src/adapters/social/profile/routes/files.ts`
    - `src/adapters/social/profile/routes/preferences.ts`
    - `src/adapters/social/profile/routes/posts.ts`
    - `src/adapters/study/classes/index.ts`
    - `src/adapters/study/classes/routes.ts`
    - `src/modules/study/languages/en/index.ts`
    - `src/modules/study/languages/ja/index.ts`
    - `src/gateways/study/gateway.ts`
- Instructions and version tracking:
    - `.github/copilot-instructions.md`
    - `src/api/gateway-bootstrap.ts`
    - `src/docs/versions.en.md`
    - adapter/module `package.json` manifests that now point to local `@cognis/core@0.1.1`

## Commits

- [feb1bbc](https://github.com/le-firehawk/Cognis/commit/feb1bbc)
- [c6ba65b](https://github.com/le-firehawk/Cognis/commit/c6ba65b)
- [acaded15](https://github.com/le-firehawk/Cognis/commit/acaded15)
- [e7255fe0](https://github.com/le-firehawk/Cognis/commit/e7255fe0)
- [a68ab2ab](https://github.com/le-firehawk/Cognis/commit/a68ab2ab)
