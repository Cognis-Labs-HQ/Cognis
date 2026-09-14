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

## Commits
- [57d2cdca](https://github.com/Cognis-Labs-HQ/Cognis/commit/57d2cdca)
- [6ce9fafe](https://github.com/Cognis-Labs-HQ/Cognis/commit/6ce9fafe)
- [e0f8bc49](https://github.com/Cognis-Labs-HQ/Cognis/commit/e0f8bc49)
- [5c3df5a3](https://github.com/Cognis-Labs-HQ/Cognis/commit/5c3df5a3)
