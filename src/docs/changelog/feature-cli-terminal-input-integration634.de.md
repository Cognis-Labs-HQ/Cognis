# CLI-Terminal und Eingaben

**Feature-Zweig:** feature-cli-terminal-input-integration634

## Eingaben und Ergebnisse trennen

Fortschrittsmeldungen pausieren während der Eingabe und werden danach fortgesetzt. Eingabeaufforderungen und Fortschritt verwenden stderr; stdout bleibt den Ergebnissen vorbehalten. EOF, Strg-C und SIGINT scheitern ohne Befehlsmutation und stellen das Terminal wieder her. Explizite Argumente bleiben für Skripte verfügbar. Erkennungsabfragen können vor den Eingaben erfolgen.

## Gültige Eingaben erfassen

CLI 0.4.7 verwendet befehlseigene Schemata für Pflichtfelder in Pfad, Anfragetext und Abfrage, unabhängig von der Hilfegruppe. Ausdrücklich freigegebene gewöhnliche Felder dürfen sichtbar sein; Passwörter, Token und nicht deklarierte Felder bleiben verborgen. Leerzeichen, gültige leere Sammlungen sowie Falsch- und Nullwerte bleiben erhalten. Die Typprüfung weist ungültige Zahlen, boolesche Werte und JSON-Formen vor der Befehlsanfrage zurück. Pflichtabfragen behalten explizite leere Werte; doppelte Feldnamen scheitern bei der Registrierung. API-Richtlinien und fachliche Prüfungen bleiben unverändert.

## Prüfung

Tests mit dem tatsächlichen CLI im PTY und öffentlichen Registrierungen prüfen Ausgabekollisionen, Abbruch, Geheimhaltung, leere Sammlungen, exakte Passwörter, Typen, Abfragen und doppelte Namen. Fokussierte Tests belegen keine produktiven Ergebnisse und nicht jeden angebotenen Ablauf. Änderungen an Löschergebnissen oder der TFA-Einrichtung sind nicht enthalten.

## Commits

- [e1a10f8767ce61c978b12e3dc6952e74edd0449a](https://github.com/Cognis-Labs-HQ/Cognis/commit/e1a10f8767ce61c978b12e3dc6952e74edd0449a)
- [74061fb3de246ca83bab453240a926931e509ba9](https://github.com/Cognis-Labs-HQ/Cognis/commit/74061fb3de246ca83bab453240a926931e509ba9)
- [f19c65ba88130bde7e5343c8cb058cd6bf699e1f](https://github.com/Cognis-Labs-HQ/Cognis/commit/f19c65ba88130bde7e5343c8cb058cd6bf699e1f)
- [8114ac3b70e53bd2fb996d80179d0a5a3743482c](https://github.com/Cognis-Labs-HQ/Cognis/commit/8114ac3b70e53bd2fb996d80179d0a5a3743482c)
