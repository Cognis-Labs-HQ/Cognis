# Clearer connection tests

## LDAP reports actionable bind failures

LDAP setup now translates directory error code 0x31 into guidance to verify the bind DN and password, while detailed causes remain in structured server logs.

## SMTP tests use the delivery queue

SMTP test messages now pass through the adapter-owned queue and rate limiter. Failed tests return a specific, actionable response instead of a generic request failure.

## Saved LDAP servers enable correctly

Authentication adapters now report their setup state through their gateway contract. A complete saved LDAP server set is recognized even though its fields and redacted password are nested under `servers`.
