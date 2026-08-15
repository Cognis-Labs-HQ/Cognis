# Reliable Return After Login

## Initialise the dashboard before resuming

Successful authentication now loads the Dashboard shell before opening the requested page, ensuring navigation contributions and keyring setup are initialised consistently.

## Accept root-relative return paths

Login return destinations may omit the leading slash. Cognis normalises them to safe root-relative paths while continuing to reject external destinations.
