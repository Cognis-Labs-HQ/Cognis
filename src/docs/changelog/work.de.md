# Kompakte Ebenen der Studienbibliothek

**Feature-Zweig:** work

## Minimale Ebenendarstellung

Bibliotheksschemas können einzelne Ebenen für kompakte Karten aktivieren, die nur den primären Inhalt des Eintrags anzeigen. Klicken, Auswahl per Rechtsklick, Variantenanzeige durch langes Drücken und eingeblendete untergeordnete Karten verwenden weiterhin das bestehende Interaktionsmodell.

## Einstellungsabhängige Popup-Typografie

Detail-Popups leiten ihre Typografie jetzt von der vom Benutzer gewählten Anwendungsschriftgröße ab und verwenden proportionale Überschriftsebenen statt einer übergroßen festen Bibliotheksüberschrift. Externe Module mit absoluten CSS-Schriftgrößen scheitern vor der Aktivierung an der Grenzprüfung.

## Scheinbaren Bibliotheksüberlauf entfernen

Ausgeblendete gerichtete Variantenkarten tragen nicht mehr zum scrollbaren Überlauf bei. Sie werden bis zur gezielten Anzeige aus dem Layout entfernt. Dadurch verschwinden der leere kartenbreite Bereich und die horizontale Bildlaufleiste, während langes Drücken und die Anzeige über Direktlinks erhalten bleiben.

## Einheitliche Bibliothekssteuerung und geprüfte Sätze

Abmelden behält beim Darüberfahren ausschließlich die rote Abbrechen-Darstellung. Minimale Karten zeigen Aussprache und lokalisierte Definition neben dem Hauptwert; Detailtitel und Audiofehler verwenden korrigierte relative Größen. Die Inhaltspaketaufnahme weist geordnete Sätze zurück, deren Text nicht durch verknüpfte lexikalische Einheiten oder Partikeln belegt ist.

## Nicht verfügbare Studienrouten umleiten

Study-SPA-Routen werden nur noch angeboten, solange mindestens ein gültiges, aktiviertes Sprachmodul vorhanden ist. Direkte Anfragen und zwischengespeicherte SPA-Einbindungen werden zu `/error?code=503` umgeleitet, wenn Study nach der Sprachvalidierung nicht verfügbar ist, statt eine leere oder defekte Study-Oberfläche darzustellen.

## Inhaltsbreite minimale Karten und deutlichere Popup-Titel

Minimale Bibliotheksraster reservieren weiterhin die vom Modul angeforderte Anzahl gleich breiter Spalten einschließlich leerer Positionen. Sichtbare Karten schrumpfen nun auf ihren Inhalt zuzüglich Innenabstand und bleiben in jedem skalierten Rasterplatz zentriert. Popup-Titel sind doppelt so groß und Titeldetails dreißig Prozent größer.

## Einheitliche Kartendetails der Bibliothek

Alle Bibliotheksebenen zeigen Definitionen nun über die gemeinsame Titel-Detail-Struktur des Popups, platzieren den Geltungsbereich neben dem Titel, verwenden standardisierte Schließen-Steuerelemente und SVG-Navigationssymbole und zeigen verknüpfte Definitionen einheitlich in der Vorschau. Gerichtete Varianten an Rasterrändern weichen nach oben aus, statt die nächste oder vorherige Zeile zu überlagern.

## Commits

- [00072b1f](https://github.com/Cognis-Labs-HQ/Cognis/commit/00072b1fcccbf14a647f48d5fb5b293f72e27332)
- [e1584351](https://github.com/Cognis-Labs-HQ/Cognis/commit/e1584351d43f0337d3aba919e5c369a50be4f69e)
- [dfbc9b22](https://github.com/Cognis-Labs-HQ/Cognis/commit/dfbc9b22569c7f426d08f075c8ac79e80fa7e165)
- [98eb5217](https://github.com/Cognis-Labs-HQ/Cognis/commit/98eb5217e93fcd9cf765f3461e78080d9e33fd74)
- [a6bb913b](https://github.com/Cognis-Labs-HQ/Cognis/commit/a6bb913bf18284dd5bd7f172994ec41fdacb78d6)
- [8ec16aee](https://github.com/Cognis-Labs-HQ/Cognis/commit/8ec16aee27bb9ba6e4d3b1461d30bb9b1003020f)
- [c7a41d2c](https://github.com/Cognis-Labs-HQ/Cognis/commit/c7a41d2c3933afa6502a7633b1f6089c816e7c8e)
