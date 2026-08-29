# Freigabefehler auf der Freigabeseite anzeigen

**Feature-Branch:** `work`

## Freigabezugriffsfehler statt Sitzungsablauf anzeigen

Zugriffsfehler beim Anzeigen freigegebener Besprechungsinhalte werden jetzt vom Freigabe-Gateway übernommen, bevor die Überwachung abgelaufener Kontositzungen reagiert. Wenn ein Host eine Besprechung beendet oder eine freigegebene Ressource anderweitig nicht mehr verfügbar ist, sehen Gäste den passenden Freigabefehler, statt durch die Wiederherstellung der Kontositzung umgeleitet zu werden.

## Commits

- [bdcaabbc](https://github.com/Cognis-Labs-HQ/Cognis/commit/bdcaabbc)
