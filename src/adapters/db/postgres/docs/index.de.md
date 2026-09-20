# PostgreSQL-Datenbankadapter

## Überblick

Der PostgreSQL-Adapter verbindet Cognis mit einem PostgreSQL-Datenbankserver. Er verwendet den `pg`-npm-Treiber und ist der empfohlene Adapter für Produktions-Deployments, die erweiterte SQL-Features, Volltextsuche oder verwaltete PostgreSQL-Dienste benötigen. Aktiviert durch `DB_TYPE=postgresql`.

## Verantwortlichkeiten

- Die `DatabaseGateway`-Schnittstelle implementieren: `query`, `execute` und `transaction`.
- Einen PostgreSQL-Connection-Pool über den `DATABASE_URL`-Verbindungsstring verwalten.
- `$1`, `$2`, …-Positionsplatzhalter-Unterstützung bereitstellen.

## Architektur

`PostgresDbGateway` in `src/adapters/db/postgres/index.ts` besitzt einen `pg.Pool`. Normale Abfragen laufen direkt über den Pool. Transaktionen reservieren einen Client für `BEGIN`, alle Callback-Anweisungen und `COMMIT` oder `ROLLBACK` und geben ihn anschließend frei. Der Adapter registriert das Leeren des Pools über die ctx-Fähigkeit `system:lifecycle`, damit beim Beenden keine Arbeit mehr angenommen wird, bevor die Verbindungen geschlossen werden.

Die Schema-Selbstheilung erhält Fremdschlüsseldefinitionen beim Hinzufügen fehlender Spalten und meldet Fehler bei der Reparatur von Indizes oder Spalten, statt sie stillschweigend zu ignorieren.

### Platzhalter-Syntax

PostgreSQL verwendet nummerierte `$N`-Platzhalter:

```sql
INSERT INTO accounts (id, email) VALUES ($1, $2)
```

## Konfiguration

| Variable                              | Standard | Beschreibung                                                               |
| ------------------------------------- | -------- | -------------------------------------------------------------------------- |
| `DB_TYPE`                             | —        | Muss `postgresql` sein, um diesen Adapter zu aktivieren                    |
| `DATABASE_URL`                        | —        | PostgreSQL-Verbindungs-URL, z.B. `postgresql://user:pass@host:5432/cognis` |
| `POSTGRES_POOL_MAX`                   | `10`     | Maximale Poolgröße (1–100)                                                 |
| `POSTGRES_POOL_IDLE_TIMEOUT_MS`       | `30000`  | Leerlaufzeitlimit in Millisekunden (1.000–600.000)                         |
| `POSTGRES_POOL_CONNECTION_TIMEOUT_MS` | `5000`   | Verbindungszeitlimit in Millisekunden (100–120.000)                        |
| `POSTGRES_POOL_STATEMENT_TIMEOUT_MS`  | —        | Optionales Anweisungszeitlimit in Millisekunden (1–3.600.000)              |
