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

- [47f407cd521a3e58adf7c371977970a0b7d5d0d2](https://github.com/Cognis-Labs-HQ/Cognis/commit/47f407cd521a3e58adf7c371977970a0b7d5d0d2)
- [8b78edeee17d2959ba6d93f290cd4ecded080b8c](https://github.com/Cognis-Labs-HQ/Cognis/commit/8b78edeee17d2959ba6d93f290cd4ecded080b8c)
- [27f332f3075194ce66dac482f706a9705f3cfd57](https://github.com/Cognis-Labs-HQ/Cognis/commit/27f332f3075194ce66dac482f706a9705f3cfd57)
- [1bd071a27173f7e7a684832b8c3f4d31445d7a9b](https://github.com/Cognis-Labs-HQ/Cognis/commit/1bd071a27173f7e7a684832b8c3f4d31445d7a9b)
