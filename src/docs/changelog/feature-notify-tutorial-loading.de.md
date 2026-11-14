# Prüfung der Anleitungen

**Feature-Zweig:** feature-notify-tutorial-loading

## Benachrichtigungskataloge prüfen

Regressionstests prüfen die Registrierung der Anleitungen für Benachrichtigungseinstellungen, Zustellung und Mitteilungsverwaltung anhand ihrer englischen, deutschen, indonesischen und japanischen Kataloge. Die Dokumentation erläutert die Katalogzuständigkeit und den Rückgriff auf Englisch.

## Registrierung mit Cache prüfen

Der Regressionstest des Tutorial-Hosts verbindet den Service Worker mit Übersetzung und gestufter Registrierung. Er prüft die Aktualisierung eines älteren Gateway-Katalogs vor der Registrierung, den englischen Ersatztext, wiederholte Offline-Registrierung und ausdrückliche Fehler bei fehlenden Übersetzungen.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/a48506a8b0cf36ceaaae372bf046b621e2230bc3
