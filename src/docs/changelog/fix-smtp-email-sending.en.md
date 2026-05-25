# SMTP Delivery Fix

## Better EHLO Fallback

The SMTP adapter now resolves EHLO from the configured SMTP relay host and only falls back to `localhost` as a last resort.

This reduces SMTP rejections on servers that do not accept `EHLO localhost`.

## SMTP Regression Coverage

Added focused SMTP adapter coverage to verify test-email delivery uses relay-host EHLO identity instead of sender-domain identity.

## Clear SMTP Test Errors

SMTP test endpoints now return structured, user-safe failure details instead of falling through to a generic bad-request response. For command-specific SMTP failures (for example `RCPT TO` rejections), the API now includes the failed SMTP command and server response code.

The Administration test-email flow now reads this API error payload and shows the specific failure message directly in the toast, so operators can immediately see why delivery was rejected.

## HELO Identity Delegation

SMTP delivery now stops deriving EHLO/HELO identity from `HOST` or the sender `from` domain. The adapter now identifies itself with the configured SMTP relay host and falls back to `localhost` only when no relay host is available.

This defers sender-identity policy handling to the adjacent mail server instead of forcing app-level HELO identities that can trigger SPF `helo` rejections.
