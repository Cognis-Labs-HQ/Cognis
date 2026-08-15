# Return After Login

## Resume the previous page

When a session times out, Cognis now retains the current page in the login URL and returns the user there after a successful login instead of always opening the Dashboard.

## Safe return destinations

Login return destinations are limited to local Cognis paths, preventing external or recursive login redirects.

## Continue through verification and TFA

Account registration carries the return destination into email verification and two-factor setup, so completing either flow continues toward the page that originally required authentication.

## Initialise the dashboard before resuming

Successful authentication now loads the Dashboard shell before opening the requested page, ensuring navigation contributions and keyring setup are initialised consistently.

## Accept root-relative return paths

Login return destinations may omit the leading slash. Cognis normalises them to safe root-relative paths while continuing to reject external destinations.
