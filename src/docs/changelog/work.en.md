# SMTP TFA Email Coordination

## TFA email codes use a neutral subject

SMTP messages that only carry a two-factor authentication code now use a neutral verification-code subject instead of the email-address verification heading. Email-address verification messages that include a verification link keep the existing email verification subject.

## Email verification follows the SMTP TFA code length

Email-address confirmation codes now use the code length configured on the shared SMTP adapter setting, so administrators control one SMTP verification-code length from either the SMTP notification adapter or the SMTP TFA adapter. The SMTP notification sender and SMTP TFA adapter also synchronize their enabled state in both directions, and SMTP TFA remains inactive whenever the SMTP notification adapter is unavailable.
