# PR-Changelog — Ctx als Basis

**Feature Branch:** copilot/update-ctx-usage-implementation

## Zusammenfassung

Die Kernverkabelung der API-Routen und mehrere Bootstrap-Pfade von Gateways und
Adaptern wurden auf ctx-basierte Fähigkeitszugriffe umgestellt.

Auth-Helfer werden nun als Route-Context-Fähigkeit bereitgestellt, sodass
API-Routen und das Module-Extension-Routing keine Auth-Gateway-Interna mehr
direkt importieren. Gateway- und Adapter-Bootstrap-Code bevorzugt jetzt
ctx-Fähigkeitsabfragen für DB-Zugriffe und ähnliche Querverbindungen.

Ein weiterer Durchgang hat die ctx-Nutzung tiefer in Adapter-Routen,
Study-Sprachmodule und gateway-eigene UI/API-Routen getragen und die
Fähigkeitsbeiträge an ihren Beitragspunkten klarer dokumentiert. Außerdem
wurden interne Workspace-Verweise auf `@cognis/core` angeglichen, damit
`npm install` wieder sauber auf das lokale Workspace-Paket auflöst.

Dieses Update behebt außerdem die Bootstrap-Reihenfolge der API, sodass das
CLI-Zugriffstoken erst erzeugt wird, nachdem die Auth-Fähigkeit aus ctx
aufgelöst wurde. Dadurch tritt der Startup-`ReferenceError` in
`src/api/main.ts` nicht mehr auf.

## Geänderte Komponenten und Dateien

- Kern/API-Fähigkeiten und Route-Context:
    - `src/core/services/gateway-service.ts`
    - `src/api/reuse/route-context.ts`
    - `src/api/server.ts`
    - `src/api/main.ts`
    - `src/modules/routes/module-extensions.ts`
- API-Routen auf injizierten Route-Context umgestellt:
    - `src/api/routes/search/index.ts`
    - `src/api/routes/modules/index.ts`
    - `src/api/routes/gateways/index.ts`
    - `src/api/routes/system/index.ts`
    - `src/api/routes/users/index.ts`
    - `src/api/routes/ui/index.ts`
- Bereinigung ctx-basierter Fähigkeiten in Gateways/Adaptern:
    - `src/gateways/auth/bootstrap.ts`
    - `src/gateways/logging/bootstrap.ts`
    - `src/gateways/db/bootstrap.ts`
    - `src/gateways/notify/bootstrap.ts`
    - `src/gateways/notify/routes/notifications.ts`
    - `src/gateways/notify/gateway.ts`
    - `src/gateways/registration/bootstrap.ts`
    - `src/gateways/social/bootstrap.ts`
    - `src/gateways/study/bootstrap.ts`
    - `src/adapters/notify/internal/index.ts`
    - `src/adapters/notify/internal/routes.ts`
    - `src/adapters/social/messages/index.ts`
    - `src/adapters/social/messages/routes.ts`
    - `src/adapters/social/profile/index.ts`
    - `src/adapters/social/profile/routes/index.ts`
    - `src/adapters/social/profile/routes/social.ts`
    - `src/adapters/social/profile/routes/files.ts`
    - `src/adapters/social/profile/routes/preferences.ts`
    - `src/adapters/social/profile/routes/posts.ts`
    - `src/adapters/study/classes/index.ts`
    - `src/adapters/study/classes/routes.ts`
    - `src/modules/study/languages/en/index.ts`
    - `src/modules/study/languages/ja/index.ts`
    - `src/gateways/study/gateway.ts`
- Anweisungen und Versionspflege:
    - `.github/copilot-instructions.md`
    - `src/api/bootstrap/gateway.ts`
    - `src/docs/versions.en.md`
    - Adapter-/Modul-`package.json`-Manifeste mit lokalem `@cognis/core@0.1.1`

## Commits

- [feb1bbc](https://github.com/Cognis-Labs-HQ/Cognis/commit/feb1bbc)
- [c6ba65b](https://github.com/Cognis-Labs-HQ/Cognis/commit/c6ba65b)
- [acaded15](https://github.com/Cognis-Labs-HQ/Cognis/commit/acaded15)
- [e7255fe0](https://github.com/Cognis-Labs-HQ/Cognis/commit/e7255fe0)
- [a68ab2ab](https://github.com/Cognis-Labs-HQ/Cognis/commit/a68ab2ab)
