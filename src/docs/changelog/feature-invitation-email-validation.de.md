# Rückmeldung zu Einladungen

**Feature-Zweig:** feature-invitation-email-validation

## Empfänger vor dem Senden korrigieren

Registration 1.2.10 prüft erforderliche Empfängeradressen mit dem gemeinsamen Formularbaukasten und der nativen E-Mail-Syntax. Lokalisierte Toasts kennzeichnen das ungültige Feld und setzen den Fokus darauf; die Eingabe bleibt zur Korrektur erhalten. Klick und Eingabetaste verwenden dieselbe Prüfung.

## Einladungsaktionen begrenzen

Wiederholte Aktionen erzeugen innerhalb eines laufenden Versuchs keine doppelten Anfragen. Schließen, Escape und Navigation geben das E-Mail-Formular frei; verspätete Ergebnisse aktualisieren keine neue Seite. Serverregeln und bisherige Einladungsergebnisse bleiben unverändert. Die Einladungsanleitung erklärt die Korrektur in allen vier Sprachen.

## Validierungsgrenzen erhalten

Fehlende Validierungsübersetzungen bleiben ausdrückliche Anwendungsfehler statt allgemeiner Einladungsfehler. Neu geöffnete Dialoge behalten ihre eigenen Beschriftungs- und Fehlerzuordnungen, auch während der vorherige Dialog noch geschlossen wird. Fehlerdetails des Anbieters werden nicht als Validierungstext angezeigt.

## Commits

- [be4a0ea68ce95344b01e2bb3a08691b49fa56c14](https://github.com/Cognis-Labs-HQ/Cognis/commit/be4a0ea68ce95344b01e2bb3a08691b49fa56c14)
- [c6e50192a043d62485e48f7a9f7fa4781fda0c4b](https://github.com/Cognis-Labs-HQ/Cognis/commit/c6e50192a043d62485e48f7a9f7fa4781fda0c4b)
