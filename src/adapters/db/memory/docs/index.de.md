# In-Memory-Datenbankadapter

## Überblick

Der Memory-Adapter ist eine No-Op-Datenbankimplementierung für automatisierte Tests und CI-Pipelines, in denen keine echte Datenbank beteiligt sein soll. Jede Abfrage gibt ein leeres Ergebnis zurück, und jedes Execute ist ein stiller No-Op. Alle ausgegebenen SQL-Anweisungen werden in `queryLog` aufgezeichnet, sodass Tests leicht prüfen können, ob die erwartete SQL generiert wurde.

Der Memory-Adapter sollte niemals in einem Produktions-Deployment verwendet werden.

## Verantwortlichkeiten

- Die `DatabaseGateway`-Schnittstelle implementieren: `query`, `execute` und `transaction`.
- Jede SQL-Anweisung und Parameter in `queryLog` aufzeichnen.
- Für alle `query()`-Aufrufe ein leeres Ergebnis (`[]`) zurückgeben.
- Für alle `execute()`-Aufrufe nichts tun.

## Architektur

```ts
const db = new MemoryDatabaseGateway();
await db.execute('INSERT INTO users (id) VALUES (?)', ['u1']);
console.log(db.queryLog);
// [{ sql: 'INSERT INTO users (id) VALUES (?)', params: ['u1'] }]
```

## Konfiguration

| Variable | Standard | Beschreibung |
| -------- | -------- | ------------ |
| `DB_TYPE` | — | Muss `memory` sein, um diesen Adapter zu aktivieren |
