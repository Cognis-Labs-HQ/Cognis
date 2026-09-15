# Enforce UI Reuse

**Feature Branch:** feature-add-tests-for-ui-page-publication-validation

## Guard page composition

Automated architecture coverage now rejects core and installed external-module pages that publish a mount function without using the Cognis page composer.

## Guard reusable utilities

External browser modules can no longer redeclare a function already offered by the Cognis UI reuse surface, and direct mount-root rendering is reported alongside missing composer use.

## Guard form composition

Core and external-module browser code must use the Cognis form builder whenever it publishes a form or handles a submission. The builder now supports trusted complex content and validated form attributes so bespoke forms retain the shared wrapper.

## Publish anonymous module pages

Enabled modules can now explicitly register a public SPA route for content such as terms of service. Anonymous clients receive only public route descriptors, while authenticated routes remain protected and public routes cannot combine anonymous access with role restrictions.

## Restore complete test coverage

The password-confirmation form builder is now injected by its browser integration so Node-based gateway tests can exercise the provider-neutral guard. Login layout coverage now verifies the composed form placement rather than relying on source declaration order.

## Add authentication document links

Login and registration now render a shared bottom link strip. Enabled modules register an authentication-footer browser contributor through `ctx`; contributors publish document links through the existing neutral footer-link capability. Publication validation now rejects commented composer placeholders, direct mount-root writes even beside a composer, and external workarounds for API requests, timestamps, feedback dialogs, and script loading.

## Show dependencies on enable

Marketplace cards no longer label a module merely because another installed or available module declares it as a dependency. Required and optional dependencies are presented only when the requesting module is being enabled, when the relationship is actionable.

## Complete anonymous legal access

The authentication footer now renders inside the visible login and registration panels, allowing registered legal-document contributors to display their links. Direct loads of server-approved public SPA routes bypass the authenticated `load-page` flow, preventing `/terms-of-service` from turning a missing session into a session-expired login redirect.

## Keep authentication links publication-aware

Authentication-footer contributors now return their currently eligible links from `listAuthFooterLinks()` instead of pushing a fixed set as an import side effect. Cognis validates and atomically replaces each provider's link set, so unpublished or withdrawn documents do not remain on login and registration pages.

## Public legal pages use the Cognis shell

The built-in License page is now explicitly public, while Changelogs remain available only inside the authenticated application and are omitted from authentication footers. Public module pages are normalized by the page composer to retain the anonymous Cognis shell instead of rendering as an unframed document.

## Restore module-published authentication links

Authentication-footer plugins may once again contribute links as an import side effect, matching the established module contract. Cognis scopes those contributions to authentication pages, preserves application-only links when a plugin removes them, and lets each module decide which published documents are eligible. Direct mounting now establishes public-page context before composition, so the public License page does not invoke account-session enforcement.

## Commits

- [57d2cdca](https://github.com/Cognis-Labs-HQ/Cognis/commit/57d2cdca)
- [6ce9fafe](https://github.com/Cognis-Labs-HQ/Cognis/commit/6ce9fafe)
- [e0f8bc49](https://github.com/Cognis-Labs-HQ/Cognis/commit/e0f8bc49)
- [5c3df5a3](https://github.com/Cognis-Labs-HQ/Cognis/commit/5c3df5a3)
- [60c9a07e](https://github.com/Cognis-Labs-HQ/Cognis/commit/60c9a07e)
- [82ac645e](https://github.com/Cognis-Labs-HQ/Cognis/commit/82ac645e)
- [841e6c76](https://github.com/Cognis-Labs-HQ/Cognis/commit/841e6c76)
- [234d0e03](https://github.com/Cognis-Labs-HQ/Cognis/commit/234d0e03)
- [5f0ad5f0](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f0ad5f0)
- [c44fcd61](https://github.com/Cognis-Labs-HQ/Cognis/commit/c44fcd61)
