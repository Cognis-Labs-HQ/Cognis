# Calendar Feed Names

## Named ICS resources

ICS variants now end with the encoded live calendar name and `.ics`. Older token-only addresses redirect after authentication to the named resource, allowing import clients to derive the correct calendar name.

## Enforced read-only transport

Read-only ICS and CalDAV shares reject every mutating WebDAV method with `403` and a `DAV:need-privileges` response. Writable CalDAV shares continue to accept supported event writes.
