# Geschützte Layoutspeicherung

**Feature-Zweig:** feature-composer-save-ownership640

## Ausstehende Speicherungen schützen

Haupteditor und verschachtelte Editoren behalten den Schutz vor dem Verlassen, während Fertig oder Zurücksetzen auf Bestätigung wartet. Layoutänderungen und wiederholtes Senden sind während der Anfrage gesperrt. Bestätigte Speicherungen behalten genau das gesendete Spaltenprofil, ohne veränderliche Entwurfsdaten zu teilen. Die Bestätigung erfordert HTTP `200` und JSON `data.saved === true`; ohne Konto oder Zugriffstoken wird keine Schreibanfrage gesendet.

## Entwürfe bei Fehlern erhalten

HTTP-Fehlerantworten und Anfragefehler erhalten den geschützten Entwurf und zeigen lokalisierte Hinweise zur Wiederherstellung. Erneutes Speichern oder Verwerfen erfolgt bewusst; bei verlorener Antwort bleibt das Serverergebnis unbekannt und die Anfrage wird nicht automatisch wiederholt. Die gemeinsame Dokumentation beschreibt nun die aktuelle Präferenzen-URL und die Profilstruktur. Auch unbestätigte Antworten erhalten den Schutz. Verwerfen kehrt zur vorherigen lokalen Ausgangsbasis zurück, die nicht zwingend ein bestätigter Serverzustand ist; erneutes Speichern sendet eine neue Anfrage. Inaktive verschachtelte Unterseiten erhalten keine verspäteten Meldungen, und abgebaute Composer ignorieren den Abschluss.

Hinweise zur Wiederherstellung verschwinden, wenn du erneut speicherst, Änderungen verwirfst, den Bereich verlässt oder die Seite schließt. So erscheint eine ältere Meldung nicht in einer anderen Bearbeitungssitzung erneut.

## Commits

- [bcfcae00603336ddd5099b3b401a94ed157b00ec](https://github.com/Cognis-Labs-HQ/Cognis/commit/bcfcae00603336ddd5099b3b401a94ed157b00ec)
- [26ba8999e905199018ecc0ab1b25e0ccc4cec107](https://github.com/Cognis-Labs-HQ/Cognis/commit/26ba8999e905199018ecc0ab1b25e0ccc4cec107)
