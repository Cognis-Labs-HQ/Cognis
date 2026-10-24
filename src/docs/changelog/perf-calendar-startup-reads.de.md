# Kalender schneller laden

**Feature-Zweig:** perf-calendar-startup-reads

## Kalender schneller laden

Der Kalender lädt Einladungen gleichzeitig mit der Kalenderliste und startet Ereignisabfragen, sobald die Liste bereitsteht. Der Seitenaufbau wartet weiterhin auf die erforderlichen Abfragen. Bei Fehlern der Einladungsabfrage bleibt die bisherige leere Einladungsliste erhalten. Jede Navigation lädt aktuelle Daten. Abbruchprüfungen verhindern den Aufbau überholter Seiten durch verspätete Antworten.

## Commits
