# Registration Tokens

The mandatory Registration Token adapter owns invitation and account-creation authorization tokens. It sends single-use links through the active email notification provider and is the token source used by the Users page for administrator and founder invitations.

## Usage examples

Administrators and founders issue invitations through the Users page. External authentication providers pass their verified email and registration token through the account-creation gate flow rather than importing the adapter.

## Technical specification

When public registration is disabled, external authentication can create a Cognis account only when its session supplies a valid token and the provider email matches the invited email. If the provider supplies no email, the account gate reports that email input is required. Cancelling that request or omitting authorization aborts login without creating an account.

Token redemption occurs only after the external account is persisted and records the matched invitation address as the account's verified primary email. Failed account or email persistence leaves the invitation usable. A replacement invitation supersedes earlier pending links only after its email is delivered successfully.
