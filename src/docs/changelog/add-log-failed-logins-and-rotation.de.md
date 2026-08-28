# Log-Stream-Filter

**Feature Branch:** copilot/add-log-failed-logins-and-rotation

## Zusammenfassung

- Fehlgeschlagene Logins und wichtige Änderungen an Benutzerkonten werden jetzt als Warnung protokolliert.
- Das Logfile speichert jetzt alle Log-Level.
- `LOG_LEVEL` wird als Basisfilter für den Admin-Log-Stream angewendet.
- Backend-Logrotation mit gzip-Komprimierung für rotierte Archive hinzugefügt.
- Standard-Prioritätsfilter in der Administrations-Logansicht auf Warnung gesetzt.

## Geänderte Dateien/Komponenten

- `src/gateways/logging/logger.ts`
- `src/gateways/logging/bootstrap.ts`
- `src/gateways/logging/ui/admin-section.js`
- `src/api/routes/users/index.ts`
- `src/gateways/logging/tests/*`
- `src/api/tests/users/user-routes.test.ts`
- `src/gateways/logging/manifest.json`
- `src/docs/versions.en.md`
- `src/gateways/logging/docs/index.*.md`
- `src/docs/devops.*.md`

## Commit-Links

- https://github.com/Cognis-Labs-HQ/Cognis/commit/749469a351ca8fad839ef6cf3f3d4eed81717b3a
