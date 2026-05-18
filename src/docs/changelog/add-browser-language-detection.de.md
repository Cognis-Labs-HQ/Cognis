# PR-Änderungsprotokoll — Browser-Spracherkennung Hinzugefügt

## Zusammenfassung

Die Initialisierung der UI-Sprache priorisiert beim ersten Laden jetzt die
vom Browser gemeldeten Sprachpräferenzen und übernimmt sie, wenn dafür
unterstützte Sprachpakete vorhanden sind.

Die Sprachauswahl auf der Registrierungsseite wählt nun standardmäßig die
erkannte unterstützte Sprache aus und behält diese Auswahl bei, bis der Nutzer
sie manuell ändert.

## Geänderte Komponenten und Dateien

- `src/ui/reuse/i18n.js`
- `src/ui/app/register/index.js`
- `src/ui/tests/browser-language-detection.test.js`

## Commits

- [pending](https://github.com/le-firehawk/Cognis/commit/pending)
