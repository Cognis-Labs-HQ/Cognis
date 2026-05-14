# PR-Änderungsprotokoll — SPA-Router-Implementierung prüfen

## Zusammenfassung

Ein SPA-Konsistenzdurchlauf für Seiten-Einstiegspunkte wurde abgeschlossen:
Für die Einladungsseite wurde Router-Abdeckung ergänzt und das Muster
`mount()` + Direct-Load-Guard auf Auth- und Einladungsseiten vereinheitlicht.

Zusätzlich wurden bei Login/Registrierung die erforderlichen
`pageContext`-Metadaten (Titel + Untertitel) ergänzt und die Modulliste für
kleine Bildschirme durch responsive Tabellen-Container verbessert.

## Geänderte Komponenten und Dateien

- Router und SPA-Tests:
    - `src/ui/reuse/app-router.js`
    - `src/ui/tests/app-router.test.js`
- Seiten-Einstiegspunkte:
    - `src/ui/app/invite/index.js`
    - `src/ui/app/login/index.js`
    - `src/ui/app/register/index.js`
    - `src/ui/app/modules/index.js`
- UI-Sprachressourcen:
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`

## Commits

- [5028bb9](https://github.com/le-firehawk/Cognis/commit/5028bb9)
