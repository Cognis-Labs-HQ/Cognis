# Geführte Anleitungen

Diese Anleitungen erklären die verfügbaren Aktionen dieser Komponente.

## Anleitung verwenden

Öffnen Sie eine der folgenden Seiten für eine noch nicht abgeschlossene Anleitung. Über das ? neben dem Seitentitel wiederholen Sie eine abgeschlossene Anleitung; Überspringen beendet die Wiederholung.

Die Anleitung zu Einladungsoptionen erklärt die Korrektur des Empfängers. E-Mail-Einladungen verwenden ein Pflichtfeld mit lokalisierten Rückmeldungen und setzen den Fokus bei Korrekturbedarf auf dieses Feld. Einladung erstellen und die Eingabetaste verwenden dieselbe Prüfung. Beim Schließen wird die unvollständige Adresse verworfen; beim erneuten Öffnen ist das Feld leer. Registrierungstoken und Einladungsverlauf behalten ihre bisherigen Bedienelemente.

## Technische Spezifikation

| Seite / Bereich                     | Anleitung            | Zugriff             |
| ----------------------------------- | -------------------- | ------------------- |
| `/invite`                           | Einladungsanleitung  | Angemeldeter Nutzer |
| `/administration` · `#registration` | Registrierungsregeln | Administrator       |

Anleitungen registrieren sich über die öffentliche Capability `ui:tutorials` mit komponenteneigenen Definitionen, Katalogen, Zielen und Lebenszyklus-Signalen. Seiten, sichtbare Bereiche und Zugriffsrechte bestimmen die Verfügbarkeit. Das Entfernen der Komponente gibt ihre Anleitungen frei. Darstellung und Abschluss beschreibt der [Tutorial-Vertrag des Hosts](/docs/tutorials).
