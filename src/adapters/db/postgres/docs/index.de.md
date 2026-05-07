# PostgreSQL-Datenbankadapter

## Überblick

Der PostgreSQL-Adapter verbindet Cognis mit einem PostgreSQL-Datenbankserver. Er verwendet den `pg`-npm-Treiber und ist der empfohlene Adapter für Produktions-Deployments, die erweiterte SQL-Features, Volltextsuche oder verwaltete PostgreSQL-Dienste benötigen. Aktiviert durch `DB_TYPE=postgresql`.

## Verantwortlichkeiten

- Die `DatabaseGateway`-Schnittstelle implementieren: `query`, `execute` und `transaction`.
- Einen PostgreSQL-Connection-Pool über den `DATABASE_URL`-Verbindungsstring verwalten.
- `$1`, `$2`, …-Positionsplatzhalter-Unterstützung bereitstellen.

## Architektur

`PostgresDbGateway` in `src/adapters/db/postgres/adapter.ts` erstellt beim Start einen `pg.Pool`.

### Platzhalter-Syntax

PostgreSQL verwendet nummerierte `$N`-Platzhalter:

```sql
INSERT INTO accounts (id, email) VALUES ($1, $2)
```

## Konfiguration

| Variable | Standard | Beschreibung |
| -------- | -------- | ------------ |
| `DB_TYPE` | — | Muss `postgresql` sein, um diesen Adapter zu aktivieren |
| `DATABASE_URL` | — | PostgreSQL-Verbindungs-URL, z.B. `postgresql://user:pass@host:5432/cognis` |
