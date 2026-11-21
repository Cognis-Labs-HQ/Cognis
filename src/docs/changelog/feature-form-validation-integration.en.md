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

- [7751793f494f1177c28987e3a74d7dbe0cb2e200](https://github.com/Cognis-Labs-HQ/Cognis/commit/7751793f494f1177c28987e3a74d7dbe0cb2e200)
- [76e82854c8ba2fc31aa94027d5578127ca041ed0](https://github.com/Cognis-Labs-HQ/Cognis/commit/76e82854c8ba2fc31aa94027d5578127ca041ed0)
- [68ea2d586774d81fa915d1df36fda3ab8a2f8912](https://github.com/Cognis-Labs-HQ/Cognis/commit/68ea2d586774d81fa915d1df36fda3ab8a2f8912)
- [103319a5a0e31443f7cb6d0bdb85e36e1e1f6e8b](https://github.com/Cognis-Labs-HQ/Cognis/commit/103319a5a0e31443f7cb6d0bdb85e36e1e1f6e8b)
