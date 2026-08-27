# Safer LDAP account and setup handling

## Administrative account disables remain authoritative

LDAP profile refreshes now preserve an existing account's enabled state, so a disabled external account cannot be reactivated by authentication.

## LDAP configuration changes are retry-safe

Removed authentication sources are reconciled before their replacement configuration is persisted, allowing failed cleanup to be retried.

## Setup errors and keyboard actions stay in context

LDAP setup displays server errors on their generated fields, keeps credential failures on the credential page, and uses Enter to verify without prematurely saving the server.
