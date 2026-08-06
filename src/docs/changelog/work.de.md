# Zuverlässige CI-Prüfungen

## Quelldateien bleiben innerhalb der Größengrenze

Die Sitzungsentsperrung, Kalenderdetail-Stile, Besprechungsseitenelemente, Whiteboard-Suche und -Statusverwaltung sowie die DOM-Bewahrung des Seiten-Composers wurden in fokussierte Nachbarmodule aufgeteilt, sodass jede Quelldatei innerhalb der Grenze von 1000 Zeilen bleibt.

## Docker-Profiltests funktionieren mit eingeschränkten Pfaden

Docker-Profiltests erkennen Bash über unterstützte absolute Pfade und überspringen Shell-Ausführungsprüfungen ausdrücklich, wenn ein minimales CI-Image Bash nicht installiert, anstatt mit einem irreführenden Startfehler abzubrechen.

## SMTP-Theme-Tests verwenden isolierte Empfänger

Der E-Mail-Test für das Standard-Theme verwendet nun eine eigene Empfängeridentität, damit die Empfänger-Ratenbegrenzung benachbarter SMTP-Tests nicht zu sporadischen Fehlern der vollständigen Testsuite führt.
