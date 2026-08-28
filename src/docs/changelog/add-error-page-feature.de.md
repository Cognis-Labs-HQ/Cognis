# Fehlerseite

**Feature Branch:** copilot/add-error-page-feature

## Navigierbare Fehlerseite mit animiertem Farbverlauf-Titel

Eine dedizierte `/error`-Seite ist jetzt verfügbar. Sie kann direkt über einen
`?code=`-Parameter aufgerufen werden (z. B. `/error?code=404`) oder erscheint
automatisch, wenn eine URL nicht gefunden wird.

Die Seite zeigt einen großen Fehlercode-Titel mit einem fließend animierten
Farbverlauf, der dieselbe Teal-zu-Marineblau-Mischung wie die globale
Navigationsleiste verwendet. Darunter erscheint eine allgemeinverständliche
Fehlerbeschreibung sowie eine Schaltfläche zum Zurückkehren zum Dashboard.

Für angemeldete Benutzer wird die Seite mit vollem Dashboard-Shell
(Navigationsleiste, Topbar und Fußzeile) gerendert. Nicht angemeldete Benutzer
sehen eine Vollbild-Nachricht ohne Shell-Chrome. Der Titel passt sich
responsive an, sodass er auch auf kleinen Bildschirmen gut lesbar bleibt.

## Commits

- [7a82d10](https://github.com/Cognis-Labs-HQ/Cognis/commit/7a82d1050c2453aaca2165271dbf75ae2f2c9876)
