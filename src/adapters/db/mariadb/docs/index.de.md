# MariaDB-Datenbankadapter

## Überblick

Der MariaDB-Adapter verbindet Cognis mit einem MariaDB- (oder MySQL-) Datenbankserver und eignet sich für Multi-Server- oder Hochverfügbarkeits-Deployments. Er verwendet den `mysql2`-npm-Treiber und Connection-Pooling. Aktiviert durch `DB_TYPE=mariadb`.

## Verantwortlichkeiten

- Die `DatabaseGateway`-Schnittstelle implementieren: `query`, `execute` und `transaction`.
- Einen MariaDB-Connection-Pool über den `DATABASE_URL`-Verbindungsstring verwalten.
- `?`-Positionsplatzhalter-Unterstützung bereitstellen.

## Architektur

`MariaDbGateway` in `src/adapters/db/mariadb/index.ts` besitzt einen Promise-Pool von `mysql2`. Normale Abfragen laufen direkt über den Pool. Transaktionen reservieren eine Verbindung für den Callback, führen Commit oder Rollback auf dieser Verbindung aus und geben sie in einem `finally`-Block frei. Der Adapter registriert das Leeren des Pools über die ctx-Fähigkeit `system:lifecycle`.

Die Schema-Selbstheilung erhält Fremdschlüsseldefinitionen beim Hinzufügen fehlender Spalten und meldet Fehler bei der Reparatur von Indizes oder Spalten, statt sie stillschweigend zu ignorieren. Ausdrücklich indexierte Textspalten verwenden `VARCHAR(255)`; die Selbstheilung konvertiert eine vorhandene `TEXT`-Spalte, bevor ihr Index angelegt wird.

### Platzhalter-Syntax

```sql
INSERT INTO accounts (id, email) VALUES (?, ?)
```

## Konfiguration

| Variable                             | Standard | Beschreibung                                                                     |
| ------------------------------------ | -------- | -------------------------------------------------------------------------------- |
| `DB_TYPE`                            | —        | Muss `mariadb` sein, um diesen Adapter zu aktivieren                             |
| `DATABASE_URL`                       | —        | MariaDB-Verbindungs-URL, z.B. `mariadb://user:pass@host:3306/cognis`             |
| `MARIADB_POOL_MAX`                   | `10`     | Maximale Poolgröße (1–100)                                                       |
| `MARIADB_POOL_IDLE_TIMEOUT_MS`       | `30000`  | Leerlaufzeitlimit in Millisekunden (1.000–600.000)                               |
| `MARIADB_POOL_CONNECTION_TIMEOUT_MS` | `5000`   | Verbindungszeitlimit in Millisekunden (100–120.000)                              |
| `MARIADB_STARTUP_TIMEOUT_MS`         | `60000`  | Maximales Zeitfenster für die Startbereitschaft in Millisekunden (1.000–600.000) |
| `MARIADB_STARTUP_RETRY_INTERVAL_MS`  | `1000`   | Pause zwischen Bereitschaftsversuchen in Millisekunden (100–30.000)              |
