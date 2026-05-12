# PR-Änderungsprotokoll — Verzeichnisstruktur Bereinigen

## Zusammenfassung

Der veraltete japanische Study-Adapter unter
`src/adapters/study/japanese/` wurde entfernt, um doppelte und
irreführende Struktur zu beseitigen, da japanische Lerninhalte nun über
Sprachmodule bereitgestellt werden.

Das Study-Gateway wurde so angepasst, dass beim Adapter-Discovery/Bootstrap
keine hartkodierte Legacy-Ausnahme mehr verwendet wird.

Auf der Profilseite wurde ein Inline-Hinweistext durch einen Info-Tooltip für
die Sichtbarkeit von Beiträgen ersetzt.

## Geänderte Dateien/Komponenten

- Study-Gateway:
    - `src/gateways/study/gateway.ts`
    - `src/gateways/study/bootstrap.ts`
    - `src/gateways/study/manifest.json`
- Entfernte Legacy-Adapter:
    - `src/adapters/study/japanese/` (entfernt)
- Profil-UI:
    - `src/ui/app/profile/index.js`
    - `src/ui/styles/profile.css`

## Commits

- [e349311](https://github.com/le-firehawk/Cognis/commit/e349311)
