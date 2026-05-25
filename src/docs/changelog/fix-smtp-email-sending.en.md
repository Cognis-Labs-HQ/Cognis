# SMTP Delivery Fix

## Better EHLO Fallback

The SMTP adapter now resolves the EHLO hostname more safely when `HOST` is unset. It first uses the configured `ehloHostname`, then the sender domain from `from`, then the SMTP host, and only falls back to `localhost` as a last resort.

This reduces SMTP rejections on servers that do not accept `EHLO localhost`.

## SMTP Regression Coverage

Added a focused SMTP adapter test to verify that test-email delivery uses the sender-domain EHLO fallback when no `HOST` environment value is available.
