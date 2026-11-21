# CLI-Terminal und Eingaben

**Feature-Zweig:** feature-cli-terminal-input-integration634

## Eingaben und Ergebnisse trennen

Fortschrittsmeldungen pausieren während der Eingabe und werden danach fortgesetzt. Eingabeaufforderungen und Fortschritt verwenden stderr; stdout bleibt den Ergebnissen vorbehalten. EOF, Strg-C und SIGINT scheitern ohne Befehlsmutation und stellen das Terminal wieder her. Explizite Argumente bleiben für Skripte verfügbar. Erkennungsabfragen können vor den Eingaben erfolgen.

## Gültige Eingaben erfassen

CLI 0.4.7 verwendet befehlseigene Schemata für Pflichtfelder in Pfad, Anfragetext und Abfrage, unabhängig von der Hilfegruppe. Ausdrücklich freigegebene gewöhnliche Felder dürfen sichtbar sein; Passwörter, Token und nicht deklarierte Felder bleiben verborgen. Leerzeichen, gültige leere Sammlungen sowie Falsch- und Nullwerte bleiben erhalten. Die Typprüfung weist ungültige Zahlen, boolesche Werte und JSON-Formen vor der Befehlsanfrage zurück. Pflichtabfragen behalten explizite leere Werte; doppelte Feldnamen scheitern bei der Registrierung. API-Richtlinien und fachliche Prüfungen bleiben unverändert.

## Prüfung

Tests mit dem tatsächlichen CLI im PTY und öffentlichen Registrierungen prüfen Ausgabekollisionen, Abbruch, Geheimhaltung, leere Sammlungen, exakte Passwörter, Typen, Abfragen und doppelte Namen. Fokussierte Tests belegen keine produktiven Ergebnisse und nicht jeden angebotenen Ablauf. Änderungen an Löschergebnissen oder der TFA-Einrichtung sind nicht enthalten.

## Commits

- [5e4b8cbd671c4e1c93366810337d2f9ba0921c69](https://github.com/Cognis-Labs-HQ/Cognis/commit/5e4b8cbd671c4e1c93366810337d2f9ba0921c69)
- [8d26b79ea4b76c6239b69ddee8a1db69fa7b84f3](https://github.com/Cognis-Labs-HQ/Cognis/commit/8d26b79ea4b76c6239b69ddee8a1db69fa7b84f3)
