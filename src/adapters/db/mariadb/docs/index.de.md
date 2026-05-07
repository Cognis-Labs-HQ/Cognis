# MariaDB-Datenbankadapter

## Überblick

Der MariaDB-Adapter verbindet Cognis mit einem MariaDB- (oder MySQL-) Datenbankserver und eignet sich für Multi-Server- oder Hochverfügbarkeits-Deployments. Er verwendet den `mariadb`-npm-Treiber und Connection-Pooling. Aktiviert durch `DB_TYPE=mariadb`.

## Verantwortlichkeiten

- Die `DatabaseGateway`-Schnittstelle implementieren: `query`, `execute` und `transaction`.
- Einen MariaDB-Connection-Pool über den `DATABASE_URL`-Verbindungsstring verwalten.
- `?`-Positionsplatzhalter-Unterstützung bereitstellen.

## Architektur

`MariaDbGateway` in `src/adapters/db/mariadb/adapter.ts` erstellt beim Start einen Connection-Pool.

### Platzhalter-Syntax

```sql
INSERT INTO accounts (id, email) VALUES (?, ?)
```

## Konfiguration

| Variable | Standard | Beschreibung |
| -------- | -------- | ------------ |
| `DB_TYPE` | — | Muss `mariadb` sein, um diesen Adapter zu aktivieren |
| `DATABASE_URL` | — | MariaDB-Verbindungs-URL, z.B. `mariadb://user:pass@host:3306/cognis` |
