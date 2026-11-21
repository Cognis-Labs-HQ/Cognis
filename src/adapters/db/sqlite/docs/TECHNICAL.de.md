# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von SQLite.

## Schnittstellen

`SqliteDbGateway(client)` implementiert DatabaseGateway. SqliteClient braucht all(statement, params), run(statement, params) mit changes und exec(statement). Strukturierte Befehle nutzen SQLite-Platzhalter und Konfliktklauseln.

## Konfiguration

Die einbettende Laufzeit erzeugt Client und Dateipfad. Der Adapter deklariert weder SQLITE_PATH noch eine Standard-Executorfabrik; DB_TYPE=sqlite allein wählt ihn nicht im Server.

## Verhalten

### Überblick

Der SQLite-Adapter stellt ein schlankes Datenbank-Gateway für SQLite-basierte Deployments, lokale Entwicklung und Tests bereit, die einen eingebetteten relationalen Speicher benötigen.

### Verantwortlichkeiten

- Die `DatabaseGateway`-Schnittstelle über `SqliteDbGateway` implementieren.
- Abfragen, Befehle und Transaktionen gegen einen bereitgestellten SQLite-Client ausführen.
- Strukturierte Datenbankbefehle mit SQLite-Platzhalter- und Konfliktsyntax unterstützen.
- SQLite-spezifische Auth-Schema-Helfer sowie SQL-Initialisierungs- und Migrationsskripte bereitstellen.

## Sicherheit

Binde Daten als Parameter und schütze Datei und Sicherungen mit Dateisystemrechten. Prüfe Anwendungsrechte vor dem Adapteraufruf.

## Referenz

- [src/adapters/db/sqlite/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/db/sqlite/manifest.json)
- [src/adapters/db/sqlite/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/db/sqlite/package.json)
- [src/adapters/db/sqlite/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/db/sqlite/index.ts)
