# Freigabe-Flow-Fix

## Whiteboard-Freigaben repariert

Die Erstellung von Whiteboard-Freigabelinks ignoriert jetzt nicht passende Ergebnisse anderer freigabefähiger Module und verwendet das passende autorisierte Whiteboard-Ergebnis, damit keine falschen 403-Fehler mehr entstehen.

## Meeting-Freigaben getrennt

Meeting-Freigabe-Hooks und das Share-Gateway wählen nun erfolgreiche passende Stufenergebnisse aus, statt anzunehmen, dass das erste Hook-Ergebnis zur angefragten Ressource gehört. Dadurch können Whiteboard- und Meeting-Freigaben sicher nebeneinander laufen.
