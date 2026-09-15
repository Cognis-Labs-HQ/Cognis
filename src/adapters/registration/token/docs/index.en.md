# Registration Tokens

The mandatory Registration Token adapter owns invitation and account-creation authorization tokens. It sends single-use links through the SMTP notification adapter and is the token source used by the Users page for administrator and founder invitations.

When public registration is disabled, external authentication can create a Cognis account only when its session supplies a valid token and the provider email matches the invited email. If the provider supplies no email, the account gate reports that email input is required. Cancelling that request or omitting authorization aborts login without creating an account.
