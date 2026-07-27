# Share recipients keep their account session

## Protected shares prompt instead of appearing missing

The Share gateway now distinguishes a valid password-protected token from an invalid token. The share page receives an authentication challenge, checks the encrypted keyring, prompts when needed, saves the verified password, and then loads the shared object.

## Notification access no longer replaces login state

Logged-in recipients retain their account token when opening a share notification. A separate scoped share token is passed directly to component renderers for shared API operations, so Calendar writes remain permission-controlled without logging the user out.
