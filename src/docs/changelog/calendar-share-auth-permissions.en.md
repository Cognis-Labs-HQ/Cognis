# Calendar Share Security

## Authentication remains required

Password-protected ICS and CalDAV links no longer contain derived credentials. Calendar clients must authenticate with the configured share password before receiving calendar data.

## Standards-based permissions

CalDAV discovery now publishes the RFC-defined current user privileges and supported VEVENT component set. ICS WebDAV probes publish read-only privileges because subscription feeds do not support writes.

## Calendar names in addresses

CalDAV variant addresses contain the encoded calendar name, allowing clients to derive a friendly name from the collection URI without exposing authentication material.
