# SMTP Auth Settings

**Feature Branch:** feature-require-username-and-password-for-smtp

## Require SMTP credentials unless authentication is disabled

SMTP notification adapter settings now treat the username and password fields as required whenever Disable Authentication is off, preventing incomplete authenticated SMTP configurations from being saved through Administration.

## Mark required fields in the form

Required field titles now display an asterisk in light and dark modes. The markers update immediately when form changes alter which SMTP fields are required.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/8983ae1fe74eac032b99e894abf857606af7260c
