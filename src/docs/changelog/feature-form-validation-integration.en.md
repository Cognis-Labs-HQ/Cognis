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

- [def09ee4825dd0fb636b56cbdecc8b2e6a3f1920](https://github.com/Cognis-Labs-HQ/Cognis/commit/def09ee4825dd0fb636b56cbdecc8b2e6a3f1920)
- [80d2e9190e3eb12d273378259384a327c1d5c55c](https://github.com/Cognis-Labs-HQ/Cognis/commit/80d2e9190e3eb12d273378259384a327c1d5c55c)
- [aef6aebc79a43bb30c1f9c53d86de0aec893c165](https://github.com/Cognis-Labs-HQ/Cognis/commit/aef6aebc79a43bb30c1f9c53d86de0aec893c165)
- [c101aaba5e70c5ef79ec79940a5d8eef86466c40](https://github.com/Cognis-Labs-HQ/Cognis/commit/c101aaba5e70c5ef79ec79940a5d8eef86466c40)
