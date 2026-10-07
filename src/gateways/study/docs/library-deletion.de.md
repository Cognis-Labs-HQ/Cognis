# Bibliothek löschen

Der Server plant die Löschbestätigung anhand der gespeicherten Schemaversionen und berücksichtigt abhängige Karten, die auf der aktuellen Seite fehlen. Der Study-Gateway-Client stellt die schreibgeschützte Löschprüfung bereit.

`POST /api/v1/study/library/entries/deletion-plan`

`{ "entryIds": ["entry-id"] }` → `{ "data": { "entryIds": ["entry-id"], "entries": [{ "id": "entry-id", "label": "..." }] } }`

Fehlende Übersetzungen abrufen verwendet `POST /api/v1/study/library/definitions/localize` mit `{ translations, languages }`. Fehlende UI-Sprachen werden über `localization:translateString` angefordert, vorhandene Übersetzungen bleiben erhalten. Bei fehlenden oder fehlerhaften Anbietern werden `missingLanguages` gemeldet. Fehlende Texte können bearbeitet werden; englische Texte werden nicht in andere Sprachfelder kopiert. Die Aktion steht auch beim manuellen Hinzufügen von Definitionen bereit.
