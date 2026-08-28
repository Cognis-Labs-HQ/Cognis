# Optional Email Registration

**Feature Branch:** copilot/update-registration-email-requirement

## Email is no longer required when User Validation Method is set to None

When the User Validation Method in Administration > Security is set to None, the email field on the registration page is now optional. The email verification notice is also hidden in this mode. The server no longer enforces email verification or deletes newly registered accounts that have no email address when validation mode is None.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/92f2856698dacd9bf208f2ffa3d0b5e77c4971fa
