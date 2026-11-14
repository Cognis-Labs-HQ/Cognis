# Geführte Anleitungen

Diese Anleitungen erklären die verfügbaren Aktionen dieser Komponente.

## Anleitung verwenden

Öffnen Sie eine der folgenden Seiten für eine noch nicht abgeschlossene Anleitung. Über das ? neben dem Seitentitel wiederholen Sie eine abgeschlossene Anleitung; Überspringen beendet die Wiederholung.

## Technische Spezifikation

| Seite / Bereich                         | Anleitung                      | Zugriff             |
| --------------------------------------- | ------------------------------ | ------------------- |
| `/settings` · `#notif-matrix-container` | Benachrichtigungseinstellungen | Angemeldeter Nutzer |
| `/administration` · `#notifications`    | Benachrichtigungszustellung    | Administrator       |
| `/administration` · `#broadcasts`       | Mitteilungen verwalten         | Administrator       |

Anleitungen registrieren sich über die öffentliche Capability `ui:tutorials` mit komponenteneigenen Definitionen, Katalogen, Zielen und Lebenszyklus-Signalen. Seiten, sichtbare Bereiche und Zugriffsrechte bestimmen die Verfügbarkeit. Das Entfernen der Komponente gibt ihre Anleitungen frei. Darstellung und Abschluss beschreibt der [Tutorial-Vertrag des Hosts](/docs/tutorials).

Optionale Test- und Veröffentlichungsschritte erscheinen nur bei verfügbaren Bedienelementen; mehrere Testschaltflächen verwenden ein sichtbares Ziel.

Die Registrierung prüft Titel und Schritte anhand des eigenen Katalogs des Gateways, bevor die Anleitungen verfügbar werden. Englisch, Deutsch, Indonesisch und Japanisch werden unterstützt. Fehlende oder leere Werte der bevorzugten Sprache verwenden denselben englischen Schlüssel. Fehlender englischer Text bleibt ein ausdrücklicher Übersetzungsfehler. Die Registrierung auf einer anderen Dashboard-Seite navigiert nicht zu Einstellungen oder Verwaltung.
