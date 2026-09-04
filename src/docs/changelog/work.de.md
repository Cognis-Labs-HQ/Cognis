# Suche für neue Räume auf Benutzer beschränken

**Feature-Zweig:** work

## Ausschließlich Benutzer bei der Raumsuche

Die Auswahl „Neuer Raum“ in Messages übergibt nun die Benutzerkategorie und den Typfilter der gemeinsamen Suche. Dies entspricht den von Jitsi Meet verwendeten Parametern und schließt andere Ergebnistypen aus.

## Reaktionsfähiger Suchstatus

Die Suche ersetzt den Hinweis zur Mindestlänge jetzt durch einen Ladestatus, sobald eine gültige Anfrage läuft. Fehlgeschlagene oder abgelaufene Anfragen zeigen einen ausdrücklichen Fehler, statt veraltete Ergebnisse oder einen nicht reagierenden Hinweis stehen zu lassen.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/6c387ba7c86b8218a9dc9b43211e5f0a95845a1d
- https://github.com/Cognis-Labs-HQ/Cognis/commit/aa9c83fcc501bfede1e9d392a2dbdd9e7a6e943e
