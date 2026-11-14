# Rückmeldung zu Einladungen

**Feature-Zweig:** feature-invitation-email-validation

## Empfänger vor dem Senden korrigieren

Registration 1.2.10 prüft erforderliche Empfängeradressen mit dem gemeinsamen Formularbaukasten und der nativen E-Mail-Syntax. Lokalisierte Toasts kennzeichnen das ungültige Feld und setzen den Fokus darauf; die Eingabe bleibt zur Korrektur erhalten. Klick und Eingabetaste verwenden dieselbe Prüfung.

## Einladungsaktionen begrenzen

Wiederholte Aktionen erzeugen innerhalb eines laufenden Versuchs keine doppelten Anfragen. Schließen, Escape und Navigation geben das E-Mail-Formular frei; verspätete Ergebnisse aktualisieren keine neue Seite. Serverregeln und bisherige Einladungsergebnisse bleiben unverändert. Die Einladungsanleitung erklärt die Korrektur in allen vier Sprachen.

## Validierungsgrenzen erhalten

Fehlende Validierungsübersetzungen bleiben ausdrückliche Anwendungsfehler statt allgemeiner Einladungsfehler. Neu geöffnete Dialoge behalten ihre eigenen Beschriftungs- und Fehlerzuordnungen, auch während der vorherige Dialog noch geschlossen wird. Fehlerdetails des Anbieters werden nicht als Validierungstext angezeigt.

## Commits

- [db32a550d3b52a892e36562f73ab1fc61e135a50](https://github.com/Cognis-Labs-HQ/Cognis/commit/db32a550d3b52a892e36562f73ab1fc61e135a50)
