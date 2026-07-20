# Token revocation fix

## Admin archiving revokes login tokens

When an administrator disables a user, the profile is archived and all active login tokens for that account are now revoked through the auth gateway capability used by account lifecycle cleanup flows. Previously, the lifecycle flow looked for that capability but the auth gateway did not publish it, allowing already signed-in archived users to keep acting until their tokens expired.
