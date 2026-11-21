# Anwendung

Praktische Abläufe für PostgreSQL.

## Voraussetzungen

Bereite eine für die Anwendung erreichbare PostgreSQL-Datenbank vor.

## Beispiele

Setze DB_TYPE=postgresql und DATABASE_URL, starte neu und prüfe die Schemainitialisierung vor dem Benutzerzugriff.

## Erwartete Ergebnisse

Die Anwendung nutzt den Verbindungspool; Transaktionen werden gemeinsam bestätigt oder bei Fehlern zurückgesetzt.

## Fehlerbehebung

Prüfe Verbindungslimits, Zugangsdaten und Datenbankrechte. Ein Anbieterwechsel kopiert keine vorhandenen Daten.
