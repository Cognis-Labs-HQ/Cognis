# Resume SSO Verification

**Feature Branch:** feature-x-sso-tfa-handoff

## Continue The Issued Challenge

SSO accounts with TFA return to the normal login form to verify their existing challenge. Retry and Cancel handle interrupted sign-in without creating a session or resending email. Auth 2.2.10 supplies a short-lived HttpOnly continuation; X SSO 1.0.63 consumes its explicit login-page marker.

## Protect Pending Attempts

Expiry, atomic verification, cancellation, supersession and logout invalidate the appropriate server-owned attempt. Older tabs cannot cancel newer attempts or overwrite their cookie. Delayed browser work is scoped to its current form.

## Commits

- [0e14cb64c42f3c5ae96710fdd1ae404db6875aed](https://github.com/Cognis-Labs-HQ/Cognis/commit/0e14cb64c42f3c5ae96710fdd1ae404db6875aed)
