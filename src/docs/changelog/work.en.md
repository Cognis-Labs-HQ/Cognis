# SMTP TFA Email Coordination

## TFA email codes use a neutral subject

SMTP messages that only carry a two-factor authentication code now use a neutral verification-code subject instead of the email-address verification heading. Email-address verification messages that include a verification link keep the existing email verification subject.

## Email verification follows the SMTP TFA code length

Email-address confirmation codes now use the code length configured on the SMTP TFA adapter, so administrators control one shared SMTP verification-code length. The SMTP notification sender and SMTP TFA adapter also synchronize their enabled state in both directions.
