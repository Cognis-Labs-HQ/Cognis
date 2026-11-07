# Geführte Anleitungen

Diese Anleitungen erklären die verfügbaren Aktionen dieser Komponente.

## Anleitung verwenden

Öffnen Sie eine der folgenden Seiten für eine noch nicht abgeschlossene Anleitung. Über das ? neben dem Seitentitel wiederholen Sie eine abgeschlossene Anleitung; Überspringen beendet die Wiederholung.

## Technische Spezifikation

| Seite / Bereich                                | Anleitung            | Zugriff             |
| ---------------------------------------------- | -------------------- | ------------------- |
| `^/study/explore(?:/\|$)`                      | Bibliothek erkunden  | Angemeldeter Nutzer |
| `^/study/library/search(?:/\|$)`               | Wörterbuchsuche      | Angemeldeter Nutzer |
| `^/study/(?:library/)?requests(?:/\|$)`        | Bibliotheksanfragen  | Angemeldeter Nutzer |
| `^/study/library(?:/\|$)` · `.library-browser` | Bibliothek verwalten | Administrator       |

Anleitungen registrieren sich über die öffentliche Capability `ui:tutorials` mit komponenteneigenen Definitionen, Katalogen, Zielen und Lebenszyklus-Signalen. Seiten, sichtbare Bereiche und Zugriffsrechte bestimmen die Verfügbarkeit. Das Entfernen der Komponente gibt ihre Anleitungen frei. Darstellung und Abschluss beschreibt der [Tutorial-Vertrag des Hosts](/docs/tutorials).

`scope` begrenzt Ziele und Erkennung. Das optionale `visibleWhen` verlangt ein eindeutig sichtbares Element, ohne Ziele auf dessen Nachfahren zu beschränken; sie bleiben innerhalb der Komponente. Die Bibliotheksverwaltung prüft damit ihren Browser und erklärt die Suche in der Seitenleiste. Ungültige Selektoren brechen die Registrierung ab und räumen den Anbieter auf.

Explore beginnt mit Ebenenseitenleiste, Filtern und einem stabilen Favoritenbeispiel. Ein Klick auf die gewählte Karte öffnet den bedingten Detailzweig; Weiter überspringt ihn. Details und optionale Schreibaktionen werden im eigenen Dialog getrennt hervorgehoben; der Dialog schließt am Zweigende.
