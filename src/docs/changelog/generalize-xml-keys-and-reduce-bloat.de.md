# i18n-Strings vereinfachen

## Zusammenfassung

Komponentenspezifische i18n-Schlüssel wurden aus den zentralen Sprachdateien in komponenteneigene `languages/`-Verzeichnisse ausgelagert. Die i18n-Schicht wurde um `loadComponentStrings` und `extendI18n` erweitert, damit Komponenten ihre eigenen Strings laden können, ohne den globalen Namensraum zu belasten. Etwa 90 veraltete und fehlplatzierten Schlüssel wurden aus den zentralen Strings-Dateien entfernt.

## Geänderte Dateien und Komponenten

- `src/ui/reuse/i18n.js` — `loadComponentStrings`, `extendI18n` und Option `componentStringBaseUrls` hinzugefügt
- `src/api/ui-registry.ts` — Feld `stringsBaseUrl` zum Interface `AdminSection` hinzugefügt
- `src/ui/app/administration/index.js` — `loadGatewaySection` verwendet nun `extendI18n`
- `src/adapters/notify/internal/ui/languages/*/strings.xml` — neue Komponentenstrings (en, de, ja, id)
- `src/gateways/notify/ui/languages/*/strings.xml` — neue Komponentenstrings (en, de, ja, id)
- `src/gateways/auth/ui/languages/*/strings.xml` — neue Komponentenstrings (en, de, ja, id)
- `src/gateways/registration/ui/languages/*/strings.xml` — neue Komponentenstrings (en, de, ja, id)
- `src/gateways/study/ui/languages/*/strings.xml` — neue Komponentenstrings (en, de, ja, id)
- `src/gateways/notify/bootstrap.ts` — `stringsBaseUrl` zur Admin-Sektion-Registrierung hinzugefügt
- `src/gateways/auth/bootstrap.ts` — `registerAdminSection` mit `stringsBaseUrl` hinzugefügt
- `src/gateways/registration/bootstrap.ts` — `stringsBaseUrl` zur Admin-Sektion-Registrierung hinzugefügt
- `src/adapters/notify/internal/ui/navbar-plugin.js` — auf Komponentenstring-Schlüssel umgestellt
- `src/gateways/notify/ui/admin-section.js` — auf Komponentenstring-Schlüssel umgestellt
- `src/gateways/auth/ui/admin-section.js` — auf Komponentenstring-Schlüssel umgestellt
- `src/gateways/registration/ui/admin-section.js` — auf Komponentenstring-Schlüssel umgestellt
- `src/gateways/study/ui/navbar.js` — auf Komponentenstring-Schlüssel umgestellt
- `src/ui/app/profile/index.js` — Statistikbezeichnungen auf `ui.reuse.profile_preview.*` umgestellt
- `src/ui/app/settings/index.js` — Schlüssel für Schriftüberschrift aktualisiert
- `src/ui/app/settings/study-prefs.js` — Schlüssel für Lehrerantrag aktualisiert
- `src/ui/app/classes/index.js` — Schlüssel für Sprachbezeichnung aktualisiert
- `src/ui/app/users/index.js` — save_failed-Schlüssel auf `ui.reuse.generic.save_failed` umgestellt
- `src/ui/languages/*/strings.xml` — ~90 veraltete/verschobene Schlüssel entfernt, `ui.reuse.generic.save_failed` hinzugefügt

## Commits

- https://github.com/le-firehawk/Cognis/commit/8e82369
- https://github.com/le-firehawk/Cognis/commit/867e397
- https://github.com/le-firehawk/Cognis/commit/8ef54f9
- https://github.com/le-firehawk/Cognis/commit/f624f07
