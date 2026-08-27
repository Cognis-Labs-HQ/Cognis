# Safer LDAP Activation

## Configure a server before activation

The LDAP adapter activation slider now remains disabled until at least one LDAP server is configured, preventing an invalid activation request.

After a verified server is added, activating the adapter saves the pending server configuration automatically. Abandoning an unsaved new server requires confirmation.

Saving from the user verification step, including by pressing Enter, now runs the authentication test automatically when needed. A failed authentication test returns the administrator to the LDAP bind fields for correction.
