# SMTP TFA Resend & Rate Limits

## Summary

The "Resend email code" link in the SMTP two-factor authentication screen now
appears on its own line directly below the code input field instead of inline
with the action area.

The resend countdown that tracks the SMTP send rate limit is now restored
correctly. The countdown begins as soon as the rate-limited state is detected,
whether that is on the initial challenge or after a failed resend attempt.

When the initial login challenge is rate-limited (meaning no verification email
was sent), a warning toast is now displayed to inform the user that a code was
recently sent and to indicate when a new one can be requested. This resolves a
silent hang that occurred when the user was rate-limited before reaching the TFA
screen.

The TFA screen is now preserved when the browser viewport changes between mobile
and desktop layout. Previously, resizing the viewport while at the TFA step
would reset the page to the credential screen. The active TFA prompt is now
restored automatically after any layout re-render so the user does not lose
their place.

## Changed files/components

- `src/gateways/tfa/ui/login-flow.js`
- `src/ui/app/login/index.js`
- `src/ui/styles/login.css`
- `src/gateways/tfa/ui/languages/*/strings.xml`
