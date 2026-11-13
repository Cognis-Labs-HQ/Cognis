# Assured Login Sessions

**Feature Branch:** feature-auth-session-assurance

## Delay session commitment

Require complete authentication before profile activation and ordinary token issuance. Fail closed on lifecycle or TFA evaluation failures, preserve explicit administrator disablement, and keep recovery codes usable during provider outages.

## Verify completion boundaries

Add staged owner contracts, atomic pending-attempt consumption, setup concurrency protection, translated errors, and component-owned offline regression coverage. Existing primary login extensions run before assessment; final login consumers now use `auth:login`.

## Preserve failed initialization

Core 0.6.4 records discovered gateway bootstrap failures separately from executable registrations. Auth distinguishes genuine optional absence and intentional disablement from failed initialization. Auth 2.2.5 and TFA 1.3.7 use terminal capabilities after all extensible policy gates, with operation-owned token cleanup and explicit non-transactional lifecycle limits.

## Commits

- [0f5aaa8: Commit sessions only after final assurance](https://github.com/Cognis-Labs-HQ/Cognis/commit/0f5aaa8b1ef309db23b947ea6361dc3369e4713f)
