# Safer LDAP Activation

## Configure a server before activation

The LDAP adapter activation slider now remains disabled until at least one LDAP server is configured, preventing an invalid activation request.

After a verified server is added, activating the adapter saves the pending server configuration automatically. Pressing Enter in the user verification step now tests authentication, and abandoning an unsaved new server requires confirmation.
