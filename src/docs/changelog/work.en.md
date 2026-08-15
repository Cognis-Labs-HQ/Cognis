# Reliable session timeouts during two-factor authentication

## Preserve the selected timeout through verification

Login sessions now retain the administrator or user-selected duration while completing two-factor verification or required setup, including non-expiring sessions.

## Reject preferences that cannot be saved

Session-timeout updates now return an availability error without revoking active sessions when preference storage is disabled.
