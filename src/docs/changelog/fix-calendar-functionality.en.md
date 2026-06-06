# Calendar Share Links

## Multiple links return to the popup

Calendar edit popups now keep every generated share link instead of replacing the
previous result. Each entry is rendered as its own collapsible block with the
link name plus separate CalDAV and ICS copy fields, so several feeds can be
managed without losing older exports.

## Private links now include passphrases

Private calendar shares now generate a dedicated passphrase for each link. The
popup shows that passphrase beside the exported URLs, and the share endpoints
accept it for CalDAV and ICS access without requiring a Cognis bearer token.

## Share links expire again

Generated links once again honour the selected expiry period and stop resolving
after that deadline passes. Public calendars now also issue distinct share-link
URLs, so every generated entry can expire independently.
