# Lebenszyklus der Uhren

**Feature-Zweig:** feature-clock-render-lifecycle

## Eine Uhr pro Anzeige

Wiederholtes Zeichnen des Dashboards verwendet die aktive Uhr weiter. Wird ihre Anzeige ersetzt oder ausgeblendet, werden der alte Timer und seine Ereignisbehandler freigegeben, statt entfernte Inhalte weiter zu aktualisieren.

## Aktualisierung beim Wechsel beenden

Die Zuständigkeit einer Dashboard-Instanz folgt dem Abbruch oder Ersatz der Navigation. Digital- und Analoguhren behalten Zeitzone, Zeitformat, Design, Barrierefreiheit und gespeicherte Anordnung bei.

## Commits

- [4fb4fe8819ae951c538f7f2f6b562fc68acf5065](https://github.com/Cognis-Labs-HQ/Cognis/commit/4fb4fe8819ae951c538f7f2f6b562fc68acf5065)
