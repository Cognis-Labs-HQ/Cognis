# Library deletion

## Usage

Deletion confirmation is planned by the server using stored schema versions and includes dependant cards absent from the current page. The Study gateway client exposes the read-only deletion preflight.

`POST /api/v1/study/library/entries/deletion-plan`

## Technical specification

`{ "entryIds": ["entry-id"] }` → `{ "data": { "entryIds": ["entry-id"], "entries": [{ "id": "entry-id", "label": "..." }] } }`

The Retrieve missing translations action calls `POST /api/v1/study/library/definitions/localize` with `{ translations, languages }`. It requests missing UI languages through `localization:translateString`, preserves supplied translations, and reports `missingLanguages` when a provider is absent or fails. Missing translations remain editable; English is not copied into other language fields. This is also available when adding a definition manually.
