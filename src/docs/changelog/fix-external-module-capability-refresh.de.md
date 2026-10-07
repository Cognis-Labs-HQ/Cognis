# Modul-Capabilities

**Feature-Zweig:** fix-external-module-capability-refresh

## Aktuelle öffentliche Capabilities

Die Suche externer Module nutzt den aktuellen System-ctx für veröffentlichte Anbieter-Capabilities. Dadurch stehen Whiteboard-eigene Boarddaten den Meeting-Modulen zur Verfügung, während private Capabilities verborgen bleiben.

## Sequenzielle Aktualisierung

Modulaktualisierungen laufen nacheinander, um Überschneidungen beim Abbau und Registrieren zu verhindern. Regressionstests prüfen getrennte Registrierungen, verifizierte Anbieter, wiederholte Aktualisierung, Deaktivierung und Reaktivierung, parallele Anfragen und Wiederherstellung nach Fehlern. API Server auf 0.6.4 erhöht.

## Commits
