# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von SQLite.

## Schnittstellen

SQLite wird über den zuständigen Funktionsdienst eingebunden; das Manifest nennt die Komponente und ihre Abhängigkeiten.

## Konfiguration

### Konfiguration

Wählen Sie das SQLite-Backend mit `DB_TYPE=sqlite`, wenn Ihr Deployment für diesen Adapter verdrahtet ist. Konfigurieren Sie den Pfad zur Datenbankdatei über die SQLite-Einstellungen Ihrer Laufzeitumgebung, zum Beispiel `SQLITE_PATH`, sofern unterstützt.

Siehe die [Datenbank-Gateway-Dokumentation](/docs/gateways/db) für allgemeine Konfigurationsdetails zum Gateway.

## Verhalten

### Überblick

Der SQLite-Adapter stellt ein schlankes Datenbank-Gateway für SQLite-basierte Deployments, lokale Entwicklung und Tests bereit, die einen eingebetteten relationalen Speicher benötigen.

### Verantwortlichkeiten

- Die `DatabaseGateway`-Schnittstelle über `SqliteDbGateway` implementieren.
- Abfragen, Befehle und Transaktionen gegen einen bereitgestellten SQLite-Client ausführen.
- Strukturierte Datenbankbefehle mit SQLite-Platzhalter- und Konfliktsyntax unterstützen.
- SQLite-spezifische Auth-Schema-Helfer sowie SQL-Initialisierungs- und Migrationsskripte bereitstellen.

## Sicherheit

Der Zugriff auf SQLite unterliegt dem Aufrufer und dem zuständigen Funktionsdienst. Die Aktivierung erweitert keine Kontorechte.

## Referenz

Quellcode und Paketmetadaten: `src/adapters/db/sqlite/`.
