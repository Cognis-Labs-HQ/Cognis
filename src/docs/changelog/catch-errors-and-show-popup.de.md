# Laufzeitfehler-Popup

**Feature Branch:** copilot/catch-errors-and-show-popup

## Routenladefehler Abfangen

Der SPA-Router umschließt Navigationsladevorgänge jetzt vollständig mit
`try/catch/finally`. Wenn Routenskripte nicht geladen werden können, wird das
Lade-Overlay immer beendet, sodass Nutzer nicht in einer Endlos-Ladeschleife
festhängen.

## Meldbare Debug-Details Anzeigen

Bei Laufzeitfehlern im Dashboard erscheint nun ein Gefahren-Popup mit
Fehlerzusammenfassung, Stack-Trace, Seiten-URL und aktuellen Konsolenmeldungen,
damit Nutzer die Details direkt in Fehlerberichte übernehmen können.

## Commits

- [e4c47c4](https://github.com/Cognis-Labs-HQ/Cognis/commit/e4c47c446cf5d1b5d2eceba77a5e1d796735d84d)
