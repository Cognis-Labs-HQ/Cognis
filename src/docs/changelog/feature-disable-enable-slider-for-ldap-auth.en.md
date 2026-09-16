# Safer LDAP Activation

**Feature Branch:** feature-disable-enable-slider-for-ldap-auth

## Configure a server before activation

The LDAP adapter activation slider now remains disabled until at least one LDAP server is configured, preventing an invalid activation request.

After a verified server is added, activating the adapter saves the pending server configuration automatically. Abandoning an unsaved new server requires confirmation.

Saving from the user verification step, including by pressing Enter, now runs the authentication test automatically when needed. A failed authentication test returns the administrator to the LDAP bind fields for correction.

Deleting the final LDAP server now requires confirmation and disables the adapter. LDAP test failures can highlight every configuration field that may have caused the failure, including server URLs, directory DNs, bind credentials, and search filters.

All LDAP setup copy is now supplied by the adapter's localized language resources. Success toasts confirm user authentication and LDAP server creation or updates.

The Authentication gateway now advertises each adapter's language-resource URL, and the LDAP language packs are served from its registered static UI directory so Administration loads them before opening setup.

Testing LDAP user authentication with an empty required credential field now shows a localized error toast. Every label key supplied to the LDAP form composer is now an adapter-owned localization key.

Disabling LDAP or removing a source now revokes every dependent user's sessions. Separate-source accounts are deleted with their dependent data, while unified accounts retain the account and can attach a refreshed identity from another configured LDAP source on their next login.

A localized success toast now confirms when Test and Discover connects successfully and returns LDAP directory data.

## Administrative account disables remain authoritative

LDAP profile refreshes now preserve an existing account's enabled state, so a disabled external account cannot be reactivated by authentication.

## LDAP configuration changes are retry-safe

Removed authentication sources are reconciled before their replacement configuration is persisted, allowing failed cleanup to be retried.

## Setup errors and keyboard actions stay in context

LDAP setup displays server errors on their generated fields, keeps credential failures on the credential page, and uses Enter to verify without prematurely saving the server.

## Commits

- [96257fa](https://github.com/Cognis-Labs-HQ/Cognis/commit/96257fa81b49645e38ae015a12d7433008d903e0)
