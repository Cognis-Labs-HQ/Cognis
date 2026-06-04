# Core Ctx- und Flow-Bus

## Übersicht

`src/core/ctx/` definiert den plattformweiten `ctx`-Capability-Bus als eigene Core-Oberfläche. Er ist bewusst unaufdringlich: Komponenten tragen Capabilities bei, registrieren Flows und injizieren gestufte Flow-Hooks, ohne interne Implementierungen anderer Komponenten zu importieren.

Dieselbe ctx-Instanz ist für Core, Gateways, Adapter, Module und Route-Bootstrap gedacht. Dadurch wird Feature-Komposition explizit und umkehrbar: Wenn eine Komponente deaktiviert wird, können ihre Flow-Hooks und Capabilities entfernt werden, ohne unabhängigen Code zu ändern.

Das Flow-Modell behandelt Arbeit als benannte Lebenszyklen mit deterministischen Stufen. Ein Flow kann Backend-Operationen (Benutzer anlegen, Passwort ändern), Messaging-Aktionen (Nachricht senden, Meeting erstellen) oder UI-Konstruktion (Einstellungsseite, Login-Seite) darstellen.

## Verantwortlichkeiten

- Eine einheitliche Oberfläche zum Beitragen und Abrufen von Capabilities bereitstellen.
- Benannte Flows mit geordneter Stage-Definition registrieren.
- Komponenten erlauben, Stage-Hooks zu injizieren und zu entfernen.
- Flows stufenweise mit stabiler Reihenfolge ausführen.
- Stage-Ausgaben für Beobachtbarkeit und Tests zurückgeben.

Nicht verantwortlich für: Persistenz, HTTP-Route-Verkabelung, Adapter-Discovery oder Richtlinien zur Aktivierung/Deaktivierung von Komponenten.

## Architektur

### Wichtige Quellpfade

| Pfad                                  | Zweck                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| `src/core/ctx/create-ctx.ts`          | Baut eine ctx-Instanz aus komposierbaren Funktionsmodulen                     |
| `src/core/ctx/types.ts`               | Öffentliche Verträge für Capabilities, Flows, Hooks und Ausführungsergebnisse |
| `src/core/ctx/register-flow.ts`       | Flow-Registrierung und Stage-Validierung                                      |
| `src/core/ctx/add-flow-stage-hook.ts` | Stage-Hook-Beitrag für Komponenten-Injektion                                  |
| `src/core/ctx/run-flow.ts`            | Laufzeit für geordnete Stage-Ausführung                                       |

Ein Flow wird einmal mit expliziten Stage-IDs registriert. Stage-Hooks werden danach mit einem `order`-Wert hinzugefügt. Während der Ausführung laufen Hooks aufsteigend nach `order`, danach nach Hook-ID für deterministisches Verhalten.

Flows können andere Flows über `context.ctx.runFlow(...)` aufrufen und so Verhalten verschachteln. Beispiel: Ein Login-Seiten-Flow ruft Login-Flow-Logik auf; Login-Flow-Hooks rufen den LDAP-Flow auf, wenn Adapter-Bedingungen erfüllt sind.

## Konfiguration

Diese Komponente hat keine Laufzeit-Umgebungsvariablen.

## Erweiterungspunkte

- Cross-Component-Capabilities über `ctx.contributeCapability(key, value)` beitragen.
- Neue Orchestrierungs-Pipelines über `ctx.registerFlow({ id, stages })` registrieren.
- Flow-Verhalten über `ctx.addFlowStageHook(flowId, stageId, hook, handler)` injizieren.
- Verhalten beim Deaktivieren einer Komponente über `ctx.removeFlowStageHook(...)` und `ctx.unregisterFlow(...)` entfernen.

## API-Routen

Diese Komponente registriert selbst keine HTTP-Routen.

## ctx.flow-API

`ctx.flow` ist eine schmale Schnittstelle für das Guard-and-Inject-Muster.
Komponenten prüfen, ob ein Flow existiert, bevor sie Hooks injizieren.

### Schnittstelle

- **`exists(flowId)`** — gibt `true` zurück, wenn der Flow registriert ist.
- **`extend(flowId, stageId, hook, handler)`** — registriert einen Stage-Hook. Gibt `true` bei Erfolg zurück, `false` bei doppelter Hook-ID (idempotent, kein Fehler).
- **`run(flowId, input?)`** — führt den Flow aus.

### Beispiel: Guard-and-Inject

```ts
if (ctx.flow.exists("construct-settings-ui")) {
    ctx.flow.extend(
        "construct-settings-ui",
        "resolve-sections",
        { id: "notify-gateway:resolve-sections" },
        () => ({ gatewayId: "notify", sectionId: "notifications" }),
    );
}
```
