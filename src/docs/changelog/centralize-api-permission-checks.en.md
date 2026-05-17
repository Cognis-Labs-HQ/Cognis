# API Permission Checks

## Summary

Fixed owner-role authorization gaps on user-scoped API endpoints and centralized
role-access evaluation utilities.

Added a broader role-access policy system for extensibility:

- API routes introduced by modules can now declare access rules with
  `minRole` (hierarchy-based) or `onlyRole` (exclusive single-role access).
- UI pages/extensions introduced by modules, gateways, and adapters can now
  declare the same access rules and are filtered centrally before delivery.

Improved role presentation in the UI so owner/admin are clearly distinguished
and moderator is treated as a first-class role in role-selection outputs.

## Changed Components and Files

- Auth role-access primitives and policy checks:
    - `src/gateways/auth/guard.ts`
    - `src/gateways/shared.ts`
- Module API route access policy support:
    - `src/modules/routes/module-extensions.ts`
    - `src/modules/sample-analytics/api/index.js`
    - `src/modules/routes/tests/module-extension-routes.test.ts`
- Module UI route declaration access support:
    - `src/api/routes/ui/index.ts`
    - `src/modules/sample-analytics/routes.json`
    - `src/core/services/module-service.ts`
- Gateway/adapter/module UI extension filtering by role policy:
    - `src/api/ui-registry.ts`
    - `src/api/routes/gateways/index.ts`
    - `src/api/tests/ui/ui-routes.test.ts`
    - `src/api/tests/gateways/gateway-routes.test.ts`
- Role labels and UI role output improvements:
    - `src/ui/reuse/access-role.js`
    - `src/ui/app/users/index.js`
    - `src/ui/app/dashboard/index.js`
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`
- Module framework docs:
    - `src/modules/docs/index.en.md`

## Commits

- [93e5f7f](https://github.com/le-firehawk/Cognis/commit/93e5f7f)
- [411e267](https://github.com/le-firehawk/Cognis/commit/411e267)
