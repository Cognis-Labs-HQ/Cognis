# Safer LDAP Activation

## Configure a server before activation

The LDAP adapter activation slider now remains disabled until at least one LDAP server is configured, preventing an invalid activation request.

After a verified server is added, activating the adapter saves the pending server configuration automatically. Abandoning an unsaved new server requires confirmation.

Saving from the user verification step, including by pressing Enter, now runs the authentication test automatically when needed. A failed authentication test returns the administrator to the LDAP bind fields for correction.

Deleting the final LDAP server now requires confirmation and disables the adapter. LDAP test failures can highlight every configuration field that may have caused the failure, including server URLs, directory DNs, bind credentials, and search filters.
