# Accessible Form Validation

**Feature Branch:** feature-form-validation-integration

## Explain evaluated errors

Invalid custom checks identify the affected input and associate the existing localized unmet requirements without replacing caller descriptions. Correction removes the owned error association. Native constraints, required markers, tab navigation and submission behavior retain their existing contracts.

## End validation listeners

Detaching or aborting a form attachment removes its input, change and blur subscriptions as well as owned ARIA state. Reattachment does not duplicate old listeners. Explicit controller validation remains available.

## Document shared guidance

The four UI guides document validation and existing tutorial coverage. Tests exercise public form-builder entry points and the real password-popup criteria with synthetic policy reads and cancellation only.

## Preserve later caller errors

Repeated invalid checks retain the latest caller-owned ARIA error value or removal. Correction, detach and abort restore that state without replacing other descriptions. An identical true value cannot be attributed to a different owner.

## Stop interrupted presentation

If a custom criterion detaches or aborts its form attachment, the running field or whole-form validation returns its result without restoring presentation after cleanup. A later explicit validation remains available and another detach clears its state.

## Commits

- [c396bee5dfcdb2e21e69e9b79ddae6f6ed61a600](https://github.com/Cognis-Labs-HQ/Cognis/commit/c396bee5dfcdb2e21e69e9b79ddae6f6ed61a600)
- [8a1c44bad0c99cd4a823421faaeb40ea992dcb86](https://github.com/Cognis-Labs-HQ/Cognis/commit/8a1c44bad0c99cd4a823421faaeb40ea992dcb86)
