# SQLite-Datenbankadapter

## Überblick

Der SQLite-Adapter stellt eine abhängigkeitslose relationale Datenbank für Einzel-Server-Cognis-Deployments bereit. Er verwendet den `better-sqlite3`-kompatiblen Client, um alle Plattformdaten in einer einzigen Datei auf dem lokalen Dateisystem zu speichern. SQLite ist der empfohlene Ausgangspunkt für kleine Deployments, lokale Entwicklung und Tests.

## Verantwortlichkeiten

- Die `DatabaseGateway`-Schnittstelle implementieren: `query`, `execute` und `transaction`.
- Die SQLite-Datenbankdatei beim Start öffnen (und ggf. erstellen).
- WAL-Modus und Fremdschlüssel-Enforcement bei jeder Verbindung aktivieren.

## Architektur

`SqliteDbGateway` in `src/adapters/db/sqlite/adapter.ts` umschließt das `better-sqlite3`-Datenbank-Handle.

### Platzhalter-Syntax

`?`-Positionsplatzhalter verwenden:

```sql
SELECT * FROM users WHERE id = ?
```

## Konfiguration

| Variable      | Standard               | Beschreibung                                                                    |
| ------------- | ---------------------- | ------------------------------------------------------------------------------- |
| `DB_TYPE`     | —                      | Muss `sqlite` sein, um diesen Adapter zu aktivieren                             |
| `SQLITE_PATH` | `./data/cognis.sqlite` | Pfad zur SQLite-Datenbankdatei; wird automatisch erstellt, wenn nicht vorhanden |
