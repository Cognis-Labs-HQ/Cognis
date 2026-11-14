# Geführte Anleitungen

Diese Anleitungen erklären die verfügbaren Aktionen dieser Komponente.

## Anleitung verwenden

Öffnen Sie eine der folgenden Seiten für eine noch nicht abgeschlossene Anleitung. Über das ? neben dem Seitentitel wiederholen Sie eine abgeschlossene Anleitung; Überspringen beendet die Wiederholung.

## Technische Spezifikation

| Seite / Bereich      | Anleitung            | Zugriff             |
| -------------------- | -------------------- | ------------------- |
| `^/messages(?:/\|$)` | Nachrichtenanleitung | Angemeldeter Nutzer |

Anleitungen registrieren sich über die öffentliche Capability `ui:tutorials` mit komponenteneigenen Definitionen, Katalogen, Zielen und Lebenszyklus-Signalen. Seiten, sichtbare Bereiche und Zugriffsrechte bestimmen die Verfügbarkeit. Das Entfernen der Komponente gibt ihre Anleitungen frei. Darstellung und Abschluss beschreibt der [Tutorial-Vertrag des Hosts](/docs/tutorials).

Das Routersignal begrenzt Tutorialregistrierungen und den Seiten-Composer. Beim Scrollen bleiben Tutorialaktionen erhalten; ein vorübergehend verlorenes gezeigtes Ziel wird ohne stilles Fortschreiten wiederhergestellt.

Die Anleitung erklärt das Verfassen einmal und zeigt Eingabe und Vorschau getrennt.

Die Gesprächsverwaltung entfällt aus Ablauf und Anzahl, solange kein Gesprächskopf verfügbar ist.

Der Schritt zum Nachrichtenverlauf zeigt im Standard-, Sprechblasen- und IRC-Stil denselben Gesprächsbereich. Nachrichten werden darin umgebrochen; gesetzte Zeilenumbrüche und Markdown bleiben erhalten. Ziele, Reihenfolge und Abschlusskennung des Rundgangs bleiben unverändert.

Der Schritt zur Nachrichteneingabe erklärt, dass Sie während des Sendens den nächsten Entwurf beginnen können. Nur die abgesendete Version wird nach Bestätigung oder dauerhafter Einreihung gelöscht; neuere Änderungen bleiben erhalten. Eingabe und Vorschau behalten ihre getrennten Ziele und die bestehende Reihenfolge.
