# Rückmeldung zu Einladungen

**Feature-Zweig:** feature-invitation-email-validation

## Empfänger vor dem Senden korrigieren

Registration 1.2.10 prüft erforderliche Empfängeradressen mit dem gemeinsamen Formularbaukasten und der nativen E-Mail-Syntax. Lokalisierte Toasts kennzeichnen das ungültige Feld und setzen den Fokus darauf; die Eingabe bleibt zur Korrektur erhalten. Klick und Eingabetaste verwenden dieselbe Prüfung.

## Einladungsaktionen begrenzen

Wiederholte Aktionen erzeugen innerhalb eines laufenden Versuchs keine doppelten Anfragen. Schließen, Escape und Navigation geben das E-Mail-Formular frei; verspätete Ergebnisse aktualisieren keine neue Seite. Serverregeln und bisherige Einladungsergebnisse bleiben unverändert. Die Einladungsanleitung erklärt die Korrektur in allen vier Sprachen.

## Validierungsgrenzen erhalten

Fehlende Validierungsübersetzungen bleiben ausdrückliche Anwendungsfehler statt allgemeiner Einladungsfehler. Neu geöffnete Dialoge behalten ihre eigenen Beschriftungs- und Fehlerzuordnungen, auch während der vorherige Dialog noch geschlossen wird. Fehlerdetails des Anbieters werden nicht als Validierungstext angezeigt.

## Commits

- [299e6dcaf23f509610d0681d0a1bd4db52b4ae7b](https://github.com/Cognis-Labs-HQ/Cognis/commit/299e6dcaf23f509610d0681d0a1bd4db52b4ae7b)
- [975769be24f31ae7dee8b2b3d15a02b910cd1268](https://github.com/Cognis-Labs-HQ/Cognis/commit/975769be24f31ae7dee8b2b3d15a02b910cd1268)
