# TFA Resend Timing

**Feature Branch:** feature-tfa-resend-timing

## Resume without another wait

Resuming an existing login challenge or selecting its method again preserves the server-issued absolute resend deadline. A deadline that has already elapsed no longer restarts the original wait. Missing or invalid absolute timing still uses the provider’s relative retry duration.

## Keep resend protections

Resend stays disabled until the deadline, and server rate limits still apply after the control becomes available. Rendering or resuming never automatically resends an existing challenge. Issued code length, verification, method selection and newer login-attempt ownership remain unchanged.

## Commits

- [59562cb8941363fa36516f7228ca73c03355d611](https://github.com/Cognis-Labs-HQ/Cognis/commit/59562cb8941363fa36516f7228ca73c03355d611)
- [11ad08e119e2452da0bd7a5d7f16014abd27cd50](https://github.com/Cognis-Labs-HQ/Cognis/commit/11ad08e119e2452da0bd7a5d7f16014abd27cd50)
