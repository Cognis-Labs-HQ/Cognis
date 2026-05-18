# PR-Änderungsprotokoll — Browser-Spracherkennung Hinzugefügt

## Zusammenfassung

Die Initialisierung der UI-Sprache priorisiert beim ersten Laden jetzt die
vom Browser gemeldeten Sprachpräferenzen und übernimmt sie, wenn dafür
unterstützte Sprachpakete vorhanden sind.

Die Sprachauswahl auf der Registrierungsseite wählt nun standardmäßig die
erkannte unterstützte Sprache aus und behält diese Auswahl bei, bis der Nutzer
sie manuell ändert.

Die Sprachpriorität wird beim Neuladen jetzt anhand der aktuellen
Browser-/Systemsprache neu ausgewertet, sodass Sprachänderungen sofort wirksam
werden; Englisch bleibt als garantierter Fallback erhalten.

## Geänderte Komponenten und Dateien

- `src/ui/reuse/i18n.js`
- `src/ui/app/register/index.js`
- `src/ui/tests/browser-language-detection.test.js`

## Commits

- [0b39a0e](https://github.com/le-firehawk/Cognis/commit/0b39a0e)
