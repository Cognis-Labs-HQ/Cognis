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

Die Zustellungsanleitung erklärt Benachrichtigung senden und die Verfügbarkeit während laufender Anfragen. Die Rundsendungsanleitung erklärt Rundsendung erstellen, Zielgruppenprüfung und Veröffentlichungsstatus. Beide erläutern den Erhalt von Entwürfen auf derselben Seite sowie Bleiben gegenüber Verwerfen und fortfahren. Das allgemeine Speichern der Einstellungen veröffentlicht keinen dieser Entwürfe. Optionale Aktionsschritte entfallen bei nicht verfügbaren Bedienelementen.

Die Rundsendungsanleitung hebt Aktualisieren als eigene Aktion hervor, um die Liste erneut zu laden und den Entwurf zu behalten, ohne Veröffentlichung oder Statusänderung zu wiederholen.
