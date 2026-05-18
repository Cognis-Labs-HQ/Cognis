# Administration → Meetings bei deaktiviertem Jitsi Meet ausblenden

## Zusammenfassung

- Der Bereich Administration → Meetings wird jetzt ausgeblendet, wenn das Jitsi-Meet-Modul deaktiviert ist.
- Die `AdminSection`-Schnittstelle unterstützt nun `isEnabled`, sodass modulbeigetragene Admin-Bereiche den aktivierten Zustand des Moduls berücksichtigen.
- Der Endpunkt `/api/v1/admin/sections` filtert jetzt Bereiche heraus, deren `isEnabled`-Prädikat false zurückgibt.
- Modulerweiterungsrouten injizieren nun `isEnabled` in `registerAdminSection`, analog zu `registerNavbarPlugin`, `registerSpaRoute` und `registerSettingsSection`.

## Geänderte Dateien/Komponenten

- `src/api/ui-registry.ts`
- `src/api/routes/gateways/index.ts`
- `src/modules/routes/module-extensions.ts`
- `src/api/tests/gateways/gateway-routes.test.ts`
- `src/api/package.json`
- `src/modules/package.json`
- `src/docs/versions.en.md`

## Commit-Links

- https://github.com/le-firehawk/Cognis/commit/46e8aae8353774aef82d36f294e0cb566ba29cc3
