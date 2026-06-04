# Ctx-Architektur-Durchsetzung

## Öffentliche Capability-Oberfläche in ctx

Das `Ctx`-Interface bietet jetzt drei neue Methoden: `contributePublicCapability`,
`isPublicCapability` und `listPublicCapabilities`. Diese ermöglichen Gateway-Bootstraps,
explizit zu deklarieren, welche Capabilities Teil ihrer öffentlichen
komponentenübergreifenden API-Oberfläche sind. Capabilities, die über den öffentlichen
Pfad beigetragen werden, sind weiterhin über die Standard-Methoden `requireCapability`
und `getCapability` abrufbar, werden aber zusätzlich als explizit öffentlich verfolgt.
Das ermöglicht eine automatisierte Durchsetzung, dass Konsumenten ausschließlich
deklarierte öffentliche Oberflächen aufrufen.

## Gateway-Vertragstypen in Core verschoben

`AuthContext`, `AuthGateway`, `QueryResult`, `DatabaseGateway`, `StoredObject`,
`FileStorageGateway` und `AccessRole` sind nun in `src/core/contracts/` definiert
und werden aus `@cognis/core` exportiert. Gateway-Dateien, die diese Definitionen
bisher besaßen, re-exportieren sie jetzt aus Core. Dadurch entfällt die Notwendigkeit,
für einen gemeinsamen Typ direkt aus einer Gateway-Datei zu importieren.

## Fehlerhafte Flow-Hook-Aufrufe korrigiert

Zwei Gateway-Bootstraps verwendeten `flowCtx.on(flowId, stageId, handler)` — eine
Drei-Argument-Kurzform, die auf dem `Ctx`-Interface nicht existiert und zu einem stillen
Laufzeitfehler geführt hätte. Beide wurden durch die korrekte Form
`addFlowStageHook(flowId, stageId, { id }, handler)` ersetzt:

- `src/gateways/social/bootstrap.ts` (vier Hooks)
- `src/gateways/notify/bootstrap/index.ts` (ein Hook)

## Statische Grenz-Durchsetzungstests

Eine neue Testdatei `src/core/tests/ctx-boundary.test.ts` prüft zur Testlaufzeit
vier Regeln statisch durch Quellcode-Analyse:

1. Das Core-Paket darf nicht aus Gateways oder der API-Schicht importieren.
2. Keine Quelldatei darf die veraltete `flowCtx.on()`-Kurzform verwenden.
3. Gateway-Vertragstypen müssen aus `@cognis/core` bezogen werden, nicht direkt
   aus Gateway-Dateien.
4. Gateway-Implementierungen dürfen keinen Produktionscode aus anderen Gateways
   importieren. (Gemeinsame Gateway-Hilfsmittel in `gateways/shared.ts` und
   `gateways/db/reuse/db-executor.ts` sind explizit in der Erlaubnisliste.)

Das Study-Gateway verletzte bisher Regel 4, indem es `AccessRole` direkt aus dem
Auth-Gateway importierte; dieser Import erfolgt nun über `@cognis/core`.

## Geänderte Komponenten und Dateien

- `src/core/ctx/state.ts`
- `src/core/ctx/types.ts`
- `src/core/ctx/create-ctx.ts`
- `src/core/ctx/contribute-public-capability.ts` (neu)
- `src/core/ctx/is-public-capability.ts` (neu)
- `src/core/ctx/list-public-capabilities.ts` (neu)
- `src/core/contracts/auth-gateway.ts`
- `src/core/contracts/db-gateway.ts` (neu)
- `src/core/contracts/files-gateway.ts` (neu)
- `src/core/index.ts`
- `src/gateways/auth/gateway.ts`
- `src/gateways/auth/access-tokens.ts`
- `src/gateways/db/gateway.ts`
- `src/gateways/files/gateway.ts`
- `src/gateways/social/bootstrap.ts`
- `src/gateways/notify/bootstrap/index.ts`
- `src/gateways/study/gateway.ts`
- `src/core/tests/ctx.test.ts`
- `src/core/tests/ctx-boundary.test.ts` (neu)

## ctx.flow-API und Entfernung von ensureCtxCapability

Ersetzt das ausführliche `ensureCtxCapability` / `addFlowStageHook`-Muster durch
`ctx.flow.exists()` / `ctx.flow.extend()` / `ctx.flow.run()`. Hook-Injektion ist
jetzt idempotent (`extend()` gibt `false` zurück statt zu werfen). Alle Gateways,
Adapter und Module erhalten `flow: FlowApi` direkt aus dem Bootstrap-Kontext.

### Geändert
- `FlowApi`-Interface und `flow`-Eigenschaft zu `Ctx` und `GatewayBootstrapBase` hinzugefügt
- `ensureCtxCapability` und `CtxCapabilityStore` aus `@cognis/core` entfernt
- Alle Gateway-Bootstraps auf `ctx.flow.extend()` migriert
- Neue Boundary-Regeln 5 und 6 in `ctx-boundary.test.ts`
