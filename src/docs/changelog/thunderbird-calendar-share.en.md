# Thunderbird Calendar Share

## Single-step client authentication

Password-protected calendar-client variants now carry a scoped, reproducible transport credential so clients can authenticate without displaying a second password prompt.

## Recognizable calendar identity

CalDAV collection URLs include the calendar name, while discovery continues to publish the display name and effective read-only or read-write privileges.

## Password protection retained

The transport credential is derived from the protected share and does not expose the chosen share password. Direct password authentication remains supported.
