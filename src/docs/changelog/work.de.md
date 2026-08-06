# Zuverlässige CI-Prüfungen

## Quelldateien bleiben innerhalb der Größengrenze

Die Sitzungsentsperrung, Kalenderdetail-Stile, Besprechungsseitenelemente, Whiteboard-Suche und -Statusverwaltung sowie die DOM-Bewahrung des Seiten-Composers wurden in fokussierte Nachbarmodule aufgeteilt, sodass jede Quelldatei innerhalb der Grenze von 1000 Zeilen bleibt.

## Docker-Profiltests funktionieren mit eingeschränkten Pfaden

Docker-Profiltests rufen erforderliche Systemprogramme nun über absolute Pfade auf, damit fremde oder eingeschränkte `PATH`-Einstellungen keine irreführenden Startfehler verursachen.
