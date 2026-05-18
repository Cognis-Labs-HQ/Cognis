# PR-Änderungsprotokoll — Browser-Spracherkennung Hinzugefügt

## Zusammenfassung

Die Initialisierung der UI-Sprache priorisiert beim ersten Laden jetzt die
vom Browser gemeldeten Sprachpräferenzen und übernimmt sie, wenn dafür
unterstützte Sprachpakete vorhanden sind.

Die Sprachauswahl auf der Registrierungsseite wählt nun standardmäßig die
erkannte unterstützte Sprache aus und behält diese Auswahl bei, bis der Nutzer
sie manuell ändert.

Unbekannte oder nicht unterstützte Sprachcodes werden nun still aus den
Spracheinstellungen entfernt, damit sie dort nicht als aktive Einträge
erscheinen.

Sobald ein Nutzer seine Sprachpriorität manuell anpasst, gilt diese Reihenfolge
als maßgeblich. Neu unterstützte Sprachen bleiben in „Verfügbar“, und spätere
Änderungen der Browser-/System-Sprachreihenfolge mischen die App nicht mehr um.

## Geänderte Komponenten und Dateien

- `src/ui/reuse/i18n.js`
- `src/ui/app/settings/index.js`
- `src/ui/app/settings/language-prefs.js`
- `src/ui/app/register/index.js`
- `src/ui/tests/browser-language-detection.test.js`

## Commits

- [0b39a0e](https://github.com/le-firehawk/Cognis/commit/0b39a0e)
- [d9550aa2](https://github.com/le-firehawk/Cognis/commit/d9550aa2)
- [a70d7e70](https://github.com/le-firehawk/Cognis/commit/a70d7e70)
- [c8634d6e](https://github.com/le-firehawk/Cognis/commit/c8634d6e)
