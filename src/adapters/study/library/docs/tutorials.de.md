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
