# PR-Changelog — Cleanup

## Zusammenfassung

Die Richtlinie für Changelog-Dateinamen wurde auf den Branch-Namen ohne
`copilot/`-Präfix umgestellt und dieser Changelog-Eintrag entsprechend
umbenannt.

Die Changelog-Dokumentation und Verweise wurden auf dieses
branch-namensbasierte Dateinamenschema angepasst.

Funktionsspezifische DB-Store-Implementierungen wurden aus
`src/adapters/db/reuse/` in die zugehörigen Gateways und Adapter verlagert,
gemäß dem Grundsatz, dass DB-Adapter/-Gateways keinen Code anderer
Gateways/Adapter enthalten dürfen und dass `reuse/`-Verzeichnisse innerhalb
von Adapter-Verzeichnissen nicht erlaubt sind.

Die Datei `.github/copilot-instructions.md` wurde aktualisiert, um beide
Regeln festzuhalten. Außerdem wurde die Changelog-Richtlinie dahingehend
erweitert, dass Einträge in allen unterstützten Anwendungssprachen (de, en,
id, ja) für jeden Pull Request erforderlich sind.

Ein MariaDB-Kompatibilitätsfehler in `ensureTable()` wurde behoben:
Textspalten, die als Primär- oder Unique-Schlüssel verwendet werden, erhalten
jetzt `VARCHAR(255)` statt `TEXT`, da MariaDB TEXT-Spalten ohne
Längenangabe in Index- oder Schlüssel-Constraints ablehnt.

## Geänderte Komponenten und Dateien

- KI-Beitragsanweisungen:
    - `.github/copilot-instructions.md`
- Dokumentationsindex/Versionierung:
    - `src/docs/index.en.md`
    - `src/docs/versions.en.md`
    - `src/docs/versions.de.md`
    - `src/docs/versions.id.md`
    - `src/docs/versions.ja.md`
- Neue Changelog-Dokumente:
    - `src/changelogs/index.en.md`
    - `src/changelogs/cleanup-strings-and-codebase.en.md`
- Entferntes Root-Changelog:
    - `CHANGELOG.md`
- Verschobene DB-Stores (entfernt aus `src/adapters/db/reuse/`):
    - `src/api/reuse/account-store.ts`
    - `src/gateways/notify/notification-store.ts`
    - `src/gateways/db/reuse/executor-log.ts`
    - `src/adapters/notify/internal/db-store.ts`
    - `src/adapters/social/profile/store.ts`
    - `src/adapters/social/profile/preference-store.ts`
- MariaDB-Adapter-Bugfix:
    - `src/adapters/db/mariadb/adapter.ts`

## Commits

- [6ab293a](https://github.com/Cognis-Labs-HQ/Cognis/commit/6ab293a)
- [8299d2b](https://github.com/Cognis-Labs-HQ/Cognis/commit/8299d2b)
- [b93c948](https://github.com/Cognis-Labs-HQ/Cognis/commit/b93c948)
