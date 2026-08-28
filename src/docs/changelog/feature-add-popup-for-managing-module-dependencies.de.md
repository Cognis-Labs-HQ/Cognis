# Abhängigkeiten externer Module

## Installation mit Abhängigkeiten

Externe Module können nicht empfohlene harte und optionale weiche Abhängigkeiten angeben. Die Installation zeigt alle Abhängigkeiten, blockiert bei unerfüllten harten Anforderungen, erlaubt die Auswahl beliebiger optionaler Begleiter und aktiviert ausgewählte Abhängigkeiten.

## Zuverlässige Aktivierung und Veröffentlichungskanäle

Das Abbrechen einer Integritätswarnung stoppt nun die Aktivierung von Abhängigkeiten und erforderliche Konfigurationsabläufe. Ausgewählte Veröffentlichungskanäle werden serverseitig gespeichert und bleiben auch vor der Installation nach Neustarts erhalten.

## Sichere Integritätsprüfung von symbolischen Links

Die SHASUM-Prüfung von Modulen folgt nun Datei-Links, deren Ziel innerhalb des Moduls liegt, einschließlich eines `AGENTS.md`-Alias für `.github/copilot-instructions.md`. Defekte Links, Verzeichnisse und Ziele außerhalb des Moduls werden weiterhin abgelehnt.

## Verifizierte Aliasse und Rückmeldung bei Abbruch

Nicht deklarierte symbolische Aliasse lösen keine SHASUM-Warnung mehr aus, wenn sie auf eine bereits deklarierte und geprüfte Moduldatei verweisen. Beim Abbruch der Installation wird nun eine eindeutige Benachrichtigung angezeigt.

## Abhängigkeitskarten für Installation und Aktivierung

Die Abhängigkeitsbestätigung zeigt nun vollständige Modulkarten mit Kennzeichnungen für erforderliche, optionale und empfohlene Module sowie direkten Detaillinks. Die Prüfung erfolgt vor Installation und Aktivierung und wird übersprungen, wenn alle Abhängigkeiten bereits aktiviert sind.
