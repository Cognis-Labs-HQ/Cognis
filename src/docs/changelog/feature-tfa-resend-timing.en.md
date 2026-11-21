# TFA Resend Timing

**Feature Branch:** feature-tfa-resend-timing

## Resume without another wait

Resuming an existing login challenge or selecting its method again preserves the server-issued absolute resend deadline. A deadline that has already elapsed no longer restarts the original wait. Missing or invalid absolute timing still uses the provider’s relative retry duration.

## Keep resend protections

Resend stays disabled until the deadline, and server rate limits still apply after the control becomes available. Rendering or resuming never automatically resends an existing challenge. Issued code length, verification, method selection and newer login-attempt ownership remain unchanged.

## Commits

- [b9626f82768c4c4905de9096bac067b3e49b4d9e](https://github.com/Cognis-Labs-HQ/Cognis/commit/b9626f82768c4c4905de9096bac067b3e49b4d9e)
- [838d72afd60749a85cd167bd7d0d28c5707c01cc](https://github.com/Cognis-Labs-HQ/Cognis/commit/838d72afd60749a85cd167bd7d0d28c5707c01cc)
