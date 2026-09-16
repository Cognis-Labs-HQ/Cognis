# Registration Tokens

The mandatory Registration Token adapter owns invitation and account-creation authorization tokens. It sends single-use links through the active email notification provider and is the token source used by the Users page for administrator and founder invitations.

## Usage examples

Administrators and founders issue invitations through the Users page. Its Email tab delivers the invitation through SMTP, while its Token tab creates the same email-bound authorization without sending mail and copies the registration link. External authentication providers hand an unknown authenticated identity to the registration flow rather than rendering their own token prompt.

## Technical specification

When public registration is disabled, external authentication can create a Cognis account only when its session supplies a valid token and the provider email matches the invited email. Cognis holds provider state behind an opaque, expiring attempt ID and redirects to this adapter's authorization form inside the standard registration shell. If the provider supplies no email, that page also requests it. Cancelling or omitting authorization aborts login without creating an account. Public registration bypasses the token stage entirely.

Founding users may successfully register at most ten invitees; pending tokens remain ordered by successful redemption and stop authorizing accounts once the limit is reached. Administrators can reset a founder's successful-invite allowance. Owners may independently disable founder invitations or administrator invitations from Administration → Registration; owner invitations remain available.

Token redemption occurs only after the external account is persisted and records the matched invitation address as the account's verified primary email. Failed account or email persistence leaves the invitation usable. A replacement invitation supersedes earlier pending links only after its email is delivered successfully.
