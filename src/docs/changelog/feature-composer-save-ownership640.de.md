# Geschützte Layoutspeicherung

**Feature-Zweig:** feature-composer-save-ownership640

## Ausstehende Speicherungen schützen

Haupteditor und verschachtelte Editoren behalten den Schutz vor dem Verlassen, während Fertig oder Zurücksetzen auf Bestätigung wartet. Layoutänderungen und wiederholtes Senden sind während der Anfrage gesperrt. Bestätigte Speicherungen behalten genau das gesendete Spaltenprofil, ohne veränderliche Entwurfsdaten zu teilen. Die Bestätigung erfordert HTTP `200` und JSON `data.saved === true`; ohne Konto oder Zugriffstoken wird keine Schreibanfrage gesendet.

## Entwürfe bei Fehlern erhalten

HTTP-Fehlerantworten und Anfragefehler erhalten den geschützten Entwurf und zeigen lokalisierte Hinweise zur Wiederherstellung. Erneutes Speichern oder Verwerfen erfolgt bewusst; bei verlorener Antwort bleibt das Serverergebnis unbekannt und die Anfrage wird nicht automatisch wiederholt. Die gemeinsame Dokumentation beschreibt nun die aktuelle Präferenzen-URL und die Profilstruktur. Auch unbestätigte Antworten erhalten den Schutz. Verwerfen kehrt zur vorherigen lokalen Ausgangsbasis zurück, die nicht zwingend ein bestätigter Serverzustand ist; erneutes Speichern sendet eine neue Anfrage. Inaktive verschachtelte Unterseiten erhalten keine verspäteten Meldungen, und abgebaute Composer ignorieren den Abschluss.

Hinweise zur Wiederherstellung verschwinden, wenn du erneut speicherst, Änderungen verwirfst, den Bereich verlässt oder die Seite schließt. So erscheint eine ältere Meldung nicht in einer anderen Bearbeitungssitzung erneut.

## Commits

- [c5c0edc70ed43280c2c0c8918e4d12ae17e14ad9](https://github.com/Cognis-Labs-HQ/Cognis/commit/c5c0edc70ed43280c2c0c8918e4d12ae17e14ad9)
