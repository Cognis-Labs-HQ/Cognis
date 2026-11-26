# Technical Reference

The public interfaces and operational rules of Registration Invitations.

## Interfaces

createRegistrationAdapter supplies invitation authorization to Registration; CLI contributions include invite:token:generate and invite:email:send.

## Configuration

Invitation issuance follows the Registration policy, including founder/admin enablement, recipient-domain restrictions and pending-invitation limits. Email delivery uses the active notification provider.

## Behavior

### Registration Tokens

The adapter declares its authorization script and language resources through `registrationUi`. The gateway loads that contribution only while the adapter and gateway are enabled.

The mandatory Registration Token adapter owns invitation and account-creation authorization tokens. It sends single-use links through the active email notification provider and is the token source used by the Users page for administrator and founder invitations.

### Invitation Commands

Administrators and owners can open `/invite` without founder status. Invitation policy still controls issuance. The enabled Registration Token adapter contributes `cognisctl invite:token:generate` to create a standalone token without SMTP delivery, and `cognisctl invite:email:send person@example.com` to send an invitation. Omitting the email opens the CLI input wizard. Both commands use the authenticated registration API and respect role, domain and delivery restrictions.

## Security

Invitation authorization binds the invited email and current policy. External-account persistence must succeed before redemption; failed delivery must not supersede a usable invitation.

## Reference

### Technical specification

When public registration is disabled, external authentication can create a Cognis account only when its session supplies a valid token and the provider email matches the invited email. Cognis holds provider state behind an opaque, expiring attempt ID and redirects to this adapter's authorization form inside the standard registration shell. If the provider supplies no email, that page also requests it. Cancelling or omitting authorization aborts login without creating an account. Public registration bypasses the token stage entirely.

Founding users may hold at most ten pending email invitations at once. Redeeming, revoking, or allowing an invitation to expire immediately returns its slot. Only administrators and owners may generate a standalone registration token. Owners may independently disable founder invitations or administrator invitations from Administration → Registration; owner invitations remain available.

Token redemption occurs only after the external account is persisted and records the matched invitation address as the account's verified primary email. Failed account or email persistence leaves the invitation usable. A replacement invitation supersedes earlier pending links only after its email is delivered successfully.
