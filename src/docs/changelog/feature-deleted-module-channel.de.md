# Modulkanäle wiederherstellen

**Feature-Zweig:** feature-deleted-module-channel

## Kataloginhalte konsistent halten

Die Katalogaktualisierung bindet Manifest und Assets an einen Commit. Das Löschen eines zusammengeführten Branches trennt ein Modul dadurch nicht von seinen Übersetzungen. Kanallisten müssen vollständige hexadezimale Commit-IDs mit 40 oder 64 Zeichen liefern; gekürzte IDs werden vor dem Lesen der Kataloginhalte abgewiesen.

## Gelöschte Auswahl ersetzen

Gelöschte Kanäle wechseln zum aktuellen Standardbranch. Gültige Auswahlen und die Herkunft der installierten Version bleiben erhalten. Unvollständige oder fehlerhafte Abrufe erhalten den bisherigen vollständigen Katalog für einen erneuten Versuch. Zugriffsfehler privater Repositories bleiben sichtbar, wenn Branch-, Release- oder Manifest-Abfragen abgewiesen werden; zwischengespeicherte Inhalte und der gespeicherte Kanal bleiben erhalten.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/b76d7122ab5a0e5471a3247b4cf9d5e04bc2784f
- https://github.com/Cognis-Labs-HQ/Cognis/commit/745d3901c67962142b3e30a7de59922181fd0694
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e63648cbd18664832c77552cc65adfed78d89caf
