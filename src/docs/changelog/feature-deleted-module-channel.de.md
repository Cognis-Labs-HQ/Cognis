# Modulkanäle wiederherstellen

**Feature-Zweig:** feature-deleted-module-channel

## Kataloginhalte konsistent halten

Die Katalogaktualisierung bindet Manifest und Assets an einen Commit. Das Löschen eines zusammengeführten Branches trennt ein Modul dadurch nicht von seinen Übersetzungen. Kanallisten müssen vollständige hexadezimale Commit-IDs mit 40 oder 64 Zeichen liefern; gekürzte IDs werden vor dem Lesen der Kataloginhalte abgewiesen.

## Gelöschte Auswahl ersetzen

Gelöschte Kanäle wechseln zum aktuellen Standardbranch. Gültige Auswahlen und die Herkunft der installierten Version bleiben erhalten. Unvollständige oder fehlerhafte Abrufe erhalten den bisherigen vollständigen Katalog für einen erneuten Versuch. Zugriffsfehler privater Repositories bleiben sichtbar, wenn Branch-, Release- oder Manifest-Abfragen abgewiesen werden; zwischengespeicherte Inhalte und der gespeicherte Kanal bleiben erhalten.

## Commits

- [1218f77880f555ba45174a29d375c3bee5825622](https://github.com/Cognis-Labs-HQ/Cognis/commit/1218f77880f555ba45174a29d375c3bee5825622)
- [d43df50371d28231e72fcdfa41ba26b6c4b3fedf](https://github.com/Cognis-Labs-HQ/Cognis/commit/d43df50371d28231e72fcdfa41ba26b6c4b3fedf)
