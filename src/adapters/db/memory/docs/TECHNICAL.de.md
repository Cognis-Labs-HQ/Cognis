# Technische Referenz

Ein nicht persistenter Datenbank-Testersatz, der Aufrufe ohne SQL-Ausführung erfasst.

## Schnittstellen

`MemoryDatabaseGateway` implementiert query, execute, transaction und getQueries in `src/adapters/db/memory/index.ts`. getQueries liefert schreibgeschützte Einträge mit statement und optional params.

## Konfiguration

Erzeuge die Klasse im Test. Sie exportiert weder canHandleDbProvider noch createDbExecutor; DB_TYPE=memory bindet sie nicht an den Standardloader.

## Verhalten

query erfasst den Aufruf und liefert `{ rows: [], rowCount: 0 }`. execute liefert `{ affectedRows: 0 }`. transaction ruft den Callback mit derselben Instanz ohne BEGIN, Rollback oder gespeicherte Zeilen auf.

## Sicherheit

Erfasste Parameter können Testgeheimnisse enthalten. Nutze synthetische Werte; dieser Ersatz bietet keine Anmeldung oder SQL-Berechtigung.

## Referenz

Prüfe Persistenz, Constraints und Isolation mit einer echten Datenbank. Siehe [Datenbank](/docs/gateways/db/technical).
