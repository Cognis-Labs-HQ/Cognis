# Changelog-Struktur Update

## Changelog-Überschriften Parsen
Die Release-Changelog-Erfassung verwendet jetzt die `#`-Überschrift als
Changelog-Titel und die `##`-Überschriften als Stichpunkte für
Release-Popups.

## Stichpunkt-Zusammenfassung Anzeigen
Das Release-Popup zeigt nun Changelog-Titel mit Stichpunkten aus den
`##`-Überschriften. Detaillierte Inhalte bleiben auf der Changelog-Seite.

## Positive Benutzereinstellung Hinzufügen
Die Einstellungen verwenden jetzt eine positive Option „Änderungsprotokolle
Anzeigen“ mit einem Info-Tooltip:
„Zeige bei jeder Veröffentlichung eine Zusammenfassung der Änderungen.“

## Neue Changelog-Regeln Dokumentieren
Die Beitragsanweisungen definieren jetzt die verpflichtende
Changelog-Struktur, bekräftigen das zentrale Verzeichnis
`src/docs/changelog/` und verlangen pro PR eine Changelog-Datei in allen
unterstützten Sprachen.
