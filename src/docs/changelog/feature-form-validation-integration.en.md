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

- [8c9fc0683b33aab169806f3783d5f702d272bf32](https://github.com/Cognis-Labs-HQ/Cognis/commit/8c9fc0683b33aab169806f3783d5f702d272bf32)
- [497c7e6aec641d2288c3202a30fc5ce97149e600](https://github.com/Cognis-Labs-HQ/Cognis/commit/497c7e6aec641d2288c3202a30fc5ce97149e600)
- [d87c318ae94cd979dbbb38bae781db1fcc762315](https://github.com/Cognis-Labs-HQ/Cognis/commit/d87c318ae94cd979dbbb38bae781db1fcc762315)
