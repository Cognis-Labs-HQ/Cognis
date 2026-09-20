# Freigabefehler auf der Freigabeseite anzeigen

**Feature-Zweig:** `feature-fix-meeting-closure-break-and-share-error-handling`

## Freigabezugriffsfehler statt Sitzungsablauf anzeigen

Zugriffsfehler beim Anzeigen freigegebener Besprechungsinhalte werden jetzt vom Freigabe-Gateway übernommen, bevor die Überwachung abgelaufener Kontositzungen reagiert. Wenn ein Host eine Besprechung beendet oder eine freigegebene Ressource anderweitig nicht mehr verfügbar ist, sehen Gäste den passenden Freigabefehler, statt durch die Wiederherstellung der Kontositzung umgeleitet zu werden.

## Entfernte Besprechungsfreigaben auf 404 umleiten

Wenn die Bereinigung einer Besprechung eine aktive Freigabe entfernt, beendet die Freigabestatusüberwachung jetzt ihre Abfragen und leitet den Gast direkt auf die öffentliche 404-Seite weiter, ohne erneut zu versuchen, die gelöschte Freigabe aufzulösen.

## Commits

- [bdcaabbc](https://github.com/Cognis-Labs-HQ/Cognis/commit/bdcaabbc)
- [3210a324](https://github.com/Cognis-Labs-HQ/Cognis/commit/3210a324)
