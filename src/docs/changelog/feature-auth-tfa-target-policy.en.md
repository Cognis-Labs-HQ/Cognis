# Privileged Account Boundaries

**Feature Branch:** feature-auth-tfa-target-policy

## Protect Account Targets

Unify privileged-account authorization under Auth and apply it before every cross-account TFA read or mutation, including recovery-code rotation and administrator reset. Preserve owner permissions and self-service while rejecting unavailable policy, unknown accounts and stale lifetimes. Users consumes the same contract without losing its action-specific restrictions.

## Verify The Owner Contract

Exercise the real staged policy and registered routes with synthetic roles, founder metadata, missing targets, malformed input, capability failures and deferred lifecycle changes. Synchronize Auth 2.2.12, TFA 1.3.13 and API 0.13.36 with four-language integration guidance.

## Refresh Before Effects

Reacquire Users authorization after request preparation and at Auth's first deprovision effect. Preserve immutable actor identity, reject late role/founder changes and revoked lifetimes, and finish valid user-to-admin profile synchronization. Keep LDAP system reconciliation distinct and document partial-completion boundaries. Add permanent delayed-body, metadata, staged-flow and malformed-guard regressions.

TFA setup and Users role-change failures use existing localized fallback messages instead of treating arbitrary server codes as translation keys or showing raw policy codes. Existing tutorials need no new controls or steps.

## Authenticate Cleanup Outcomes

Bind deprovision receipts to the original input and invocation in Auth, and require those owner-issued outcomes in Users and every bundled cleanup consumer. Reject forged later-stage results and cross-run replay without reauthorizing completed effects. Update owning versions, tested dependency ceilings and four-language rollout guidance. The audited older Jitsi companion remains a deployment dependency: migrate its cleanup hook or disable it before treating the installed deployment as protected.

## Preserve Invocation Envelopes

Core 0.6.6 now shallow-freezes the flow context references already declared readonly, while preserving mutable input/data/result contents and stage ordering. Auth checks this runtime guarantee and fails closed on legacy runners. Add retained-pair replay, mixed-release and generic real-runner controls; update all 23 tested Core ceilings and verify public workspace resolution. Static repository and companion audits found no supported top-level envelope assignments.

## Commits

- [305b4b3cb7a6024a690ddde78d708675932b532d](https://github.com/Cognis-Labs-HQ/Cognis/commit/305b4b3cb7a6024a690ddde78d708675932b532d)
