# Safer LDAP Activation

## Configure a server before activation

The LDAP adapter activation slider now remains disabled until at least one LDAP server is configured, preventing an invalid activation request.

After a verified server is added, activating the adapter saves the pending server configuration automatically. Abandoning an unsaved new server requires confirmation.

Saving from the user verification step, including by pressing Enter, now runs the authentication test automatically when needed. A failed authentication test returns the administrator to the LDAP bind fields for correction.

Deleting the final LDAP server now requires confirmation and disables the adapter. LDAP test failures can highlight every configuration field that may have caused the failure, including server URLs, directory DNs, bind credentials, and search filters.

All LDAP setup copy is now supplied by the adapter's localized language resources. Success toasts confirm user authentication and LDAP server creation or updates.

The Authentication gateway now advertises each adapter's language-resource URL, and the LDAP language packs are served from its registered static UI directory so Administration loads them before opening setup.

Testing LDAP user authentication with an empty required credential field now shows a localized error toast. Every label key supplied to the LDAP form composer is now an adapter-owned localization key.

Disabling LDAP or removing a source now revokes every dependent user's sessions. Separate-source accounts are deleted with their dependent data, while unified accounts retain the account and can attach a refreshed identity from another configured LDAP source on their next login.
