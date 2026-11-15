# Mobile Study-Navigation

**Feature-Zweig:** fix-study-mobile-navigation

## Kompakte Study-Steuerung

Die Hauptnavigation verwendet ein Menüsymbol. Study-Seitenlinks bleiben in einer horizontal scrollbaren Zeile; Größen- und Schriftänderungen bringen den aktiven Link wieder ins Sichtfeld. Sprache, Wörterbuchsuche und Einstellungen teilen sich die zweite Zeile. Auf kleinen Bildschirmen öffnet die Wörterbuchsuche einen Dialog, der das ursprüngliche Formular und die Eingabe erhält, den Fokus zurückgibt und bei Navigation oder Wechsel zur Desktopgröße schließt.

## Übersichtliche Study-Seiten

Study-Karten passen in schmale Spalten; die Übersicht verwendet den natürlichen Dokumentlauf. Beim Scrollen kompakter Study-Seiten macht die Markenzeile Platz, während die Hauptnavigation erreichbar bleibt. Der Flashcards-Alias zeigt die ausgewählte Sprache, ohne auf die Navigation in sein noch ladendes Modul zu warten. Wörterbuchziele der Einführung folgen der sichtbaren Steuerung.

## Schmale Formulare und Filter

Study-Suchsteuerungen umbrechen innerhalb schmaler Inhaltsspalten. Markenbereich und Eingabefelder der Anmeldung und Registrierung passen sich auch bei 253 Pixeln an die verfügbare Breite an.

## Sichere Browser-Testeingaben

Chromium-Tests übergeben Zugangsdaten, Selektoren und Navigationswerte als strukturierte Protokollargumente, statt daraus JavaScript zu erzeugen. Regressionstests prüfen problematische Zeichen, direkte und SPA-Navigation, gefüllte Study-Seiten, Telefon- und Tablet-Ausrichtungen sowie Desktoplayouts. Implementierungen externer Module bleiben ausgeschlossen.

## Commits

- [d1b5fe1ac](https://github.com/Cognis-Labs-HQ/Cognis/commit/d1b5fe1ac497bc516a04d1f06717007512a6a40e)
- [f4f6d3a84](https://github.com/Cognis-Labs-HQ/Cognis/commit/f4f6d3a84b587d4eb169b5db76b850956544ad31)
