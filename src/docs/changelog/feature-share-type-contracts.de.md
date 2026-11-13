# Typisierte Share-Verträge

**Feature-Zweig:** feature-share-type-contracts

## Typisierte Token-Ergebnisse

Share 1.9.9 deklariert die Token-Felder der Erstellungs-, Änderungs- und Listenfunktionen, einschließlich Metadaten, Ablaufzeit, Empfängern und gewährten Berechtigungen. Bootstrap-Callbacks und strukturierte Abfragetests verwenden explizite Verträge. Eigentümerprüfungen und der Widerruf durch eine leere Berechtigungsliste bleiben erhalten.

## Tests und Sicherheit

Synthetische Tests prüfen gespeicherte Token-Ergebnisse, abgewiesene Änderungen durch Nicht-Eigentümer und die Bereinigung von Gastprofilen. Empfänger-, Passwort-, Adapter- und Ablaufprüfungen behalten ihr bisheriges Verhalten.

## Commits

- [f8c570ec93b88599220fcbf1ec5b18d617e01136](https://github.com/Cognis-Labs-HQ/Cognis/commit/f8c570ec93b88599220fcbf1ec5b18d617e01136)
