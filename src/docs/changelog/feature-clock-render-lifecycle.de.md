# Lebenszyklus der Uhren

**Feature-Zweig:** feature-clock-render-lifecycle

## Eine Uhr pro Anzeige

Wiederholtes Zeichnen des Dashboards verwendet die aktive Uhr weiter. Wird ihre Anzeige ersetzt oder ausgeblendet, werden der alte Timer und seine Ereignisbehandler freigegeben, statt entfernte Inhalte weiter zu aktualisieren.

## Aktualisierung beim Wechsel beenden

Die Zuständigkeit einer Dashboard-Instanz folgt dem Abbruch oder Ersatz der Navigation. Digital- und Analoguhren behalten Zeitzone, Zeitformat, Design, Barrierefreiheit und gespeicherte Anordnung bei.

## Commits

- [8306134d322a6688d20ed5b64b68b9931b2de6ae](https://github.com/Cognis-Labs-HQ/Cognis/commit/8306134d322a6688d20ed5b64b68b9931b2de6ae)
