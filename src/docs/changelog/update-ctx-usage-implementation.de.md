# PR-Changelog — Ctx als Fähigkeits-Backbone etablieren

## Zusammenfassung

Die Kernverkabelung der API-Routen und mehrere Bootstrap-Pfade von Gateways und
Adaptern wurden auf ctx-basierte Fähigkeitszugriffe umgestellt.

Auth-Helfer werden nun als Route-Context-Fähigkeit bereitgestellt, sodass
API-Routen und das Module-Extension-Routing keine Auth-Gateway-Interna mehr
direkt importieren. Gateway- und Adapter-Bootstrap-Code bevorzugt jetzt
ctx-Fähigkeitsabfragen für DB-Zugriffe und ähnliche Querverbindungen.

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
    - `src/gateways/db/bootstrap.ts`
    - `src/gateways/notify/bootstrap.ts`
    - `src/gateways/notify/gateway.ts`
    - `src/gateways/registration/bootstrap.ts`
    - `src/gateways/social/bootstrap.ts`
    - `src/gateways/study/bootstrap.ts`
    - `src/adapters/notify/internal/index.ts`
    - `src/adapters/social/messages/index.ts`
    - `src/adapters/social/profile/index.ts`
    - `src/adapters/study/classes/index.ts`
- Anweisungen und Versionspflege:
    - `.github/copilot-instructions.md`
    - `src/api/gateway-bootstrap.ts`
    - `src/docs/versions.en.md`

## Commits

- [feb1bbc](https://github.com/le-firehawk/Cognis/commit/feb1bbc)
