# Calendar Authentication

## Protected calendar discovery

Calendar clients now receive an authentication challenge when they probe a valid password-protected calendar share, instead of an indistinguishable not-found response.

## Safe token inspection

Share can verify that a token exists and is active without bypassing its password, allowing Calendar to request credentials before returning any shared content.
