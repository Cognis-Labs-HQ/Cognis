# Return After Login

## Resume the previous page

When a session times out, Cognis now retains the current page in the login URL and returns the user there after a successful login instead of always opening the Dashboard.

## Safe return destinations

Login return destinations are limited to local Cognis paths, preventing external or recursive login redirects.

## Continue through verification and TFA

Account registration carries the return destination into email verification and two-factor setup, so completing either flow continues toward the page that originally required authentication.
