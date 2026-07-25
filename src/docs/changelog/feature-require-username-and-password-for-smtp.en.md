# SMTP Auth Settings

## Require SMTP credentials unless authentication is disabled

SMTP notification adapter settings now treat the username and password fields as required whenever Disable Authentication is off, preventing incomplete authenticated SMTP configurations from being saved through Administration.
