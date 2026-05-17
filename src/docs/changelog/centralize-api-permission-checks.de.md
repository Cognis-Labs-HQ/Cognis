# API-Berechtigungen

## Zusammenfassung

Autorisierungslücken für die Rolle `owner` bei benutzerbezogenen API-Endpunkten
wurden behoben und die Rollenprüfung zentralisiert.

Zusätzlich wurde ein erweiterbares Rollenrichtlinien-System eingeführt:

- Von Modulen eingeführte API-Routen können jetzt `minRole` (hierarchisch)
  oder `onlyRole` (exklusive Einzelrolle) deklarieren.
- Von Modulen, Gateways und Adaptern eingeführte UI-Seiten/-Erweiterungen
  können dieselben Regeln deklarieren und werden zentral gefiltert.

Außerdem wurde die Rollendarstellung in der UI verbessert, damit `owner` und
`admin` klar unterscheidbar sind und `moderator` als vollständige Rolle geführt
wird.

## Geänderte Komponenten und Dateien

- Rollenrichtlinien im Auth-Bereich:
    - `src/gateways/auth/guard.ts`
    - `src/gateways/shared.ts`
- Rollenrichtlinien für Modul-API-Routen:
    - `src/modules/routes/module-extensions.ts`
    - `src/modules/sample-analytics/api/index.js`
    - `src/modules/routes/tests/module-extension-routes.test.ts`
- Rollenrichtlinien für Modul-UI-Routen:
    - `src/api/routes/ui/index.ts`
    - `src/modules/sample-analytics/routes.json`
    - `src/core/services/module-service.ts`
- Rollenfilter für UI-Erweiterungen (Gateway/Adapter/Modul):
    - `src/api/ui-registry.ts`
    - `src/api/routes/gateways/index.ts`
    - `src/api/tests/ui/ui-routes.test.ts`
    - `src/api/tests/gateways/gateway-routes.test.ts`
- Rollenlabels und UI-Ausgabe:
    - `src/ui/reuse/access-role.js`
    - `src/ui/app/users/index.js`
    - `src/ui/app/dashboard/index.js`
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`
- Modul-Framework-Dokumentation:
    - `src/modules/docs/index.en.md`

## Commits

- [93e5f7f](https://github.com/le-firehawk/Cognis/commit/93e5f7f)
- [411e267](https://github.com/le-firehawk/Cognis/commit/411e267)
