# Scoped Registration

**Feature Branch:** feature-onboarding-credential-scope

## Restricted Onboarding

Registration now uses bounded Auth-owned authority for declared self-service operations, never ordinary sessions. Notify verification remains scoped to the new account; normal login still enforces TFA.

## Explicit Completion

Completion, cancellation and real login revoke onboarding authority. Provider lifecycle and persistence failures fail closed; already-completed external effects cannot be rolled back atomically.

## Extension Migration

Completion extensions use declared operations rather than arbitrary authenticated requests. Coordinate this release with Terms of Service 1.6.13; retain actual consent and document-version checks.

Registration blocks submission when required completion handlers, declarations or form fields are unavailable. Operation declarations are captured before extension callbacks, and leaving verification closes its popup and revokes the credential.

## Commits

- [485d68f4864c40bd172b1745b0ef3ee21956ab7c](https://github.com/Cognis-Labs-HQ/Cognis/commit/485d68f4864c40bd172b1745b0ef3ee21956ab7c)
- [8c1b5561367b4e0377ea58a582deefd01f37d2e5](https://github.com/Cognis-Labs-HQ/Cognis/commit/8c1b5561367b4e0377ea58a582deefd01f37d2e5)
