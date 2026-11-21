# Usage

Practical procedures for Registration Invitations.

## Prerequisites

Invitation policy controls issuance; standalone tokens require administrator or owner access.

## Examples

Run `cognisctl invite:email:send person@example.com` to send mail, or `cognisctl invite:token:generate` for an authorized standalone link.

Administrators and founders issue invitations through the Users page. Its Email tab delivers the invitation through SMTP, while its Token tab creates the same email-bound authorization without sending mail and copies the registration link. External authentication providers hand an unknown authenticated identity to the registration flow rather than rendering their own token prompt.

## Expected Results

Redemption creates the authorized account and consumes the invitation; successful delivery supersedes earlier pending invitations.

## Troubleshooting

Check invitation expiry, invited email, policy and mail delivery. Founder invitations have a ten-pending-invitation limit.
