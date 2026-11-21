# Usage

Practical procedures for Email Verification.

## Prerequisites

Your account needs a verified primary email and working email delivery.

## Examples

Request a setup code, enter the received code and confirm; use the enabled method when sign-in asks for verification.

## Expected Results

Successful confirmation enables the method; code length and resend timing follow email-delivery policy.

## Troubleshooting

Check spam and resend timing. Restarting the server invalidates pending codes; clustered deployments need challenge requests pinned to one instance.
