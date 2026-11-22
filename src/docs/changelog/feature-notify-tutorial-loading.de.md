# Prüfung der Anleitungen

**Feature-Zweig:** feature-notify-tutorial-loading

## Benachrichtigungskataloge prüfen

Regressionstests prüfen die Registrierung der Anleitungen für Benachrichtigungseinstellungen, Zustellung und Mitteilungsverwaltung anhand ihrer englischen, deutschen, indonesischen und japanischen Kataloge. Die Dokumentation erläutert die Katalogzuständigkeit und den Rückgriff auf Englisch.

## Registrierung mit Cache prüfen

Der Regressionstest des Tutorial-Hosts verbindet den Service Worker mit Übersetzung und gestufter Registrierung. Er prüft die Aktualisierung eines älteren Gateway-Katalogs vor der Registrierung, den englischen Ersatztext, wiederholte Offline-Registrierung und ausdrückliche Fehler bei fehlenden Übersetzungen.

## Commits

- [259a14e8891311577230fe8d391a80b0aefacd10](https://github.com/Cognis-Labs-HQ/Cognis/commit/259a14e8891311577230fe8d391a80b0aefacd10)
