# Library deletion

Deletion confirmation is planned by the server using stored schema versions and includes dependant cards absent from the current page. The Study gateway client exposes the read-only deletion preflight.

`POST /api/v1/study/library/entries/deletion-plan`

`{ "entryIds": ["entry-id"] }` → `{ "data": { "entryIds": ["entry-id"], "entries": [{ "id": "entry-id", "label": "..." }] } }`
