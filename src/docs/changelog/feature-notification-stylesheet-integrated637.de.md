# Benachrichtigungsdarstellung

**Feature-Zweig:** feature-notification-stylesheet-integrated637

## Darstellung nach Fehlern wiederherstellen

Interne Benachrichtigungen teilen einen Stylesheet-Ladeversuch mit fünf Sekunden Zeitlimit. Bei Fehlern oder Zeitablauf bleibt der Posteingang mit einer übersetzten Warnung verfügbar; eine spätere Anbieterinstanz kann das Stylesheet neu anfordern. Abbrüche erhalten andere wartende Instanzen und funktionsfähige externe Stylesheets. Späte Ergebnisse reaktivieren keinen beendeten Anbieter.

## Posteingangsverhalten erhalten

Benachrichtigungsaktionen, Abfragen, die Lebensdauer eingehender Meldungen und die Arbeitsplatz-Anleitung bleiben unverändert. Der Adapter für interne Benachrichtigungen hat jetzt Version 0.5.38.

## Commits

- [8c7de04038c52b7e323a3f550a16526bb753d213](https://github.com/Cognis-Labs-HQ/Cognis/commit/8c7de04038c52b7e323a3f550a16526bb753d213)
