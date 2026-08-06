# Reliable CI Checks

## Source files remain within the size guardrail

Split session-unlock persistence, calendar detail styling, meeting page elements, whiteboard search and status handling, and page-composer DOM preservation into focused sibling modules so each source file remains within the 1000-line limit.

## Docker profile tests run with restricted paths

Docker profile tests now discover Bash from supported absolute paths and explicitly skip shell-execution checks when a minimal CI image does not install Bash, rather than failing with a misleading spawn error.

## SMTP theme tests use isolated recipients

The default-theme email test now uses its own recipient identity so recipient rate limiting from adjacent SMTP tests cannot make the full suite fail intermittently.

## Keyring tests remain component-isolated

Removed an unused direct import of the UI context singleton from the keyring test setup, so the adapter tests exercise the keyring surface without depending on another component's internal export shape.
