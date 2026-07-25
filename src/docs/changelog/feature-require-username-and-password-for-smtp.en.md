# SMTP Auth Settings

## Require SMTP credentials unless authentication is disabled

SMTP notification adapter settings now treat the username and password fields as required whenever Disable Authentication is off, preventing incomplete authenticated SMTP configurations from being saved through Administration.

## Mark required fields in the form

Required field titles now display an asterisk in light and dark modes. The markers update immediately when form changes alter which SMTP fields are required.
