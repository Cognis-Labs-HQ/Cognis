# Bibliothek löschen

Der Server plant die Löschbestätigung anhand der gespeicherten Schemaversionen und berücksichtigt abhängige Karten, die auf der aktuellen Seite fehlen. Der Study-Gateway-Client stellt die schreibgeschützte Löschprüfung bereit.

`POST /api/v1/study/library/entries/deletion-plan`

`{ "entryIds": ["entry-id"] }` → `{ "data": { "entryIds": ["entry-id"], "entries": [{ "id": "entry-id", "label": "..." }] } }`
