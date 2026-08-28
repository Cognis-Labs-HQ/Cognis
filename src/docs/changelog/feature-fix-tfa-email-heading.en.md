# SMTP TFA Email Coordination

**Feature Branch:** feature-fix-tfa-email-heading

## TFA email codes use a neutral subject

SMTP messages that only carry a two-factor authentication code now use a neutral verification-code subject instead of the email-address verification heading. Email-address verification messages that include a verification link keep the existing email verification subject.

## Email verification follows the SMTP TFA code length

Email-address confirmation codes now use the code length configured on the shared SMTP adapter setting, so administrators control one SMTP verification-code length from either the SMTP notification adapter or the SMTP TFA adapter. Enabling SMTP TFA now enables the SMTP notification sender when needed, while SMTP TFA remains independently disableable and unavailable whenever the SMTP notification adapter cannot send mail.

## Commits

- [d164f42](https://github.com/Cognis-Labs-HQ/Cognis/commit/d164f428bb4f843efe7a875c172855182e7a4548)
