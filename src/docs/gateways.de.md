# Gateway- und Adapter-Leitfaden

## Überblick

Ein Gateway ist die alleinige Autorität für eine abgegrenzte Domäne in Cognis.
Es besitzt das Schema, die Routen, Capabilities und Adapter dieser Domäne. Der
Rest der Plattform importiert niemals direkt aus Gateway-Code — er konsumiert
Capabilities aus dem gemeinsamen `CapabilityStore` oder ruft die öffentliche
Schnittstelle des Gateways auf.

Adapter sind die konkreten Implementierungen, die unter einem Gateway leben. Sie
werden vom Gateway beim Serverstart entdeckt und gebootstrapped. Weder Core noch
der Server wissen, welche Adapter vorhanden sind.

## Verantwortlichkeiten

### Gateway

- Eine `manifest.json` besitzen, die seine Identität und Abhängigkeiten deklariert.
- Eine `bootstrap(ctx)`-Funktion exportieren, die der Server beim Start aufruft.
- Sich während des Bootstraps in der `GatewayRegistry` registrieren.
- HTTP-Routen über `ctx.routeRegistry` registrieren.
- Capabilities in `ctx.capabilities` beitragen.
- Eigene Adapter aus `src/adapters/<gateway-id>/` entdecken und bootstrappen.

### Adapter

- Eine `bootstrap<Domain>Adapter(ctx)`-Funktion exportieren.
- Domänenlogik, Schema-Einrichtung und Routenregistrierung implementieren.
- Sich beim Gateway registrieren durch Aufruf von `ctx.gateway.registerSender(...)`
  oder `ctx.gateway.registerAdapter(...)`.
- Sich niemals direkt in der `GatewayRegistry` registrieren.

## Architektur

### Verzeichnisstruktur

```
src/gateways/<id>/
  manifest.json
  bootstrap.ts           — Re-Export aus ./bootstrap/index.js
  bootstrap/
    index.ts             — Orchestriert Unter-Dateien; exportiert bootstrap()
    routes.ts            — Routen-Hilfsfunktionen (wenn bootstrap/ verwendet)
    ...                  — weitere fokussierte Unter-Dateien
  gateway.ts
  routes/
    index.ts             — HTTP-Routen-Handler dieses Gateways
  docs/
    index.en.md
    index.de.md
    index.ja.md
    index.id.md

src/adapters/<id>/<adapter-id>/
  package.json           — name, version, "main": "index.ts"
  index.ts               — Orchestrator; re-exportiert öffentliche API
  docs/
    index.en.md
    ...
  tests/
```

### Dateistruktur-Konventionen

Jede Komponente muss eine `index.ts` (oder `index.js`) als orchestrierenden Einstiegspunkt verwenden. Das gilt auf jeder Verschachtelungsebene: Das `bootstrap/`-Verzeichnis eines Gateways hat eine `bootstrap/index.ts`; das `routes/`-Verzeichnis hat eine `routes/index.ts`; ein Adapter-Verzeichnis hat eine `index.ts`.

**Einstiegspunkte sind immer `index.ts`.** Keine Dateinamen, die aus dem übergeordneten Verzeichnis abgeleitet werden: `src/adapters/notify/smtp/index.ts`, nicht `smtp-notification-sender.ts` als öffentliche Exportoberfläche. Der Verzeichnisname liefert bereits den Kontext.

**Route-Dateien leben in `routes/`-Unterverzeichnissen.** Keine flache `routes.ts` oder `<feature>-routes.ts` direkt im Komponentenwurzelverzeichnis. Route-Handler-Dateien müssen `routes/index.ts` (oder `routes/<sub-domain>/index.ts`) sein.

**Große Dateien mit Unterverzeichnissen aufteilen.** Wenn eine Datei ca. 400 Zeilen überschreitet, wird sie in ein Verzeichnis umgewandelt: Die ursprüngliche Datei wird zum einzeiligen Barrel, das aus `./dirname/index.js` re-exportiert; die Implementierung wandert in `dirname/index.ts`; logische Abschnitte werden in fokussierte Geschwister-Dateien extrahiert. Beispiel:

```
src/gateways/notify/
  bootstrap.ts            — 1 Zeile: export { bootstrap } from "./bootstrap/index.js"
  bootstrap/
    index.ts              — bootstrap()-Funktion; importiert aus Geschwister-Dateien
    stores.ts             — Store-Interfaces und Initialisierungs-Helfer
    user-email-routes.ts  — createUserEmailRoutes()
    adapter-routes.ts     — createGatewayAdapterRoutes()
```

````

### manifest.json

```json
{
    "id": "notify",
    "name": "Notification Gateway",
    "version": "1.3.0",
    "description": "Pluggable notification dispatch.",
    "publisher": "Cognis Labs HQ",
    "required": false,
    "requires": ["db"],
    "hasAdapters": true
}
````

| Feld          | Pflicht | Beschreibung                                                             |
| ------------- | ------- | ------------------------------------------------------------------------ |
| `id`          | Ja      | Eindeutige Kennung; entspricht dem Verzeichnisnamen                      |
| `name`        | Ja      | Menschenlesbarer Anzeigename                                             |
| `version`     | Ja      | Semantische Versionsnummer; bei jeder Änderung erhöhen                   |
| `description` | Nein    | Ein Satz, der in der Admin-UI angezeigt wird                             |
| `required`    | Nein    | Wenn `true`, verweigert der Server den Start bei Bootstrap-Fehler        |
| `requires`    | Nein    | IDs von Gateways, die vor diesem initialisiert sein müssen               |
| `hasAdapters` | Nein    | Wenn `true`, zeigt die Admin-UI einen Adapter-Bereich für dieses Gateway |

### bootstrap.ts

Die Bootstrap-Datei ist der einzige Einstiegspunkt, den der Server aufruft. Für neue oder kleine Gateways exportiert sie die `bootstrap`-Funktion direkt. Wenn die Bootstrap-Logik ca. 400 Zeilen überschreitet, wird `bootstrap.ts` zum einzeiligen Re-Export-Barrel und die Implementierung lebt in einem `bootstrap/`-Unterverzeichnis:

```ts
// bootstrap.ts (Barrel-Form — wenn Implementierung aufgeteilt ist)
export { bootstrap } from "./bootstrap/index.js";
```

```ts
// bootstrap/index.ts (oder bootstrap.ts für kleine Gateways)
import type { GatewayBootstrapContext } from "../shared.js";

export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    // 1. Capabilities früherer Gateways lesen
    // 2. Gateway-Klasse instanziieren
    // 3. Adapter bootstrappen
    // 4. Routen registrieren
    // 5. Capabilities beitragen
    // 6. In der Gateway-Registry registrieren
    // 7. UI-Bereiche registrieren
}
```

`GatewayBootstrapContext` bietet:

| Feld              | Typ               | Beschreibung                                                      |
| ----------------- | ----------------- | ----------------------------------------------------------------- |
| `gatewayRegistry` | `GatewayRegistry` | `.register(manifest)` aufrufen, um das Gateway sichtbar zu machen |
| `capabilities`    | `CapabilityStore` | `.get<T>(key)` lesen; `.contribute(key, v)` schreiben             |
| `routeRegistry`   | `RouteRegistry`   | `.register(handler, gatewayId?)` für HTTP-Routen                  |
| `uiRegistry`      | `UIRegistry`      | Admin-Bereiche und statische Verzeichnisse registrieren           |
| `adaptersRoot`    | `string`          | Absoluter Pfad zu `src/adapters/`                                 |
| `log`             | `BootstrapLog?`   | Strukturierter Logger; verfügbar nach dem Logging-Gateway         |

### Adapter-Entdeckung

Adapter werden durch Scannen von `src/adapters/<gateway-id>/` entdeckt:

```ts
try {
    await bootstrapFn(adapterCtx);
} catch (err) {
    ctx.log?.(
        "error",
        `Adapter "${entry}" Bootstrap fehlgeschlagen — übersprungen.`,
        {
            component: "foo-gateway",
            adapter: entry,
            error: err instanceof Error ? err.message : String(err),
        },
    );
}
```

Jeder Adapter-Aufruf muss in einem eigenen `try/catch` stehen. Wenn ein Fehler
propagiert, fängt der `GatewayService` ihn still ab — das Gateway registriert
sich dann nie.

### Einen Adapter schreiben

```ts
export async function bootstrapNotifyAdapter(
    ctx: NotifyAdapterBootstrapCtx,
): Promise<void> {
    const smtpHost = process.env.COGNIS_SMTP_HOST;
    if (!smtpHost) {
        ctx.log?.(
            "warn",
            "SMTP-Adapter: COGNIS_SMTP_HOST nicht gesetzt — übersprungen.",
        );
        return;
    }

    const sender = createSmtpSender(smtpHost, ctx.log);
    ctx.gateway.registerSender(sender);
}
```

- Fehlende Abhängigkeiten mit Warnung und `return` behandeln, nie werfen.
- Erst am Ende registrieren, wenn alles erfolgreich eingerichtet ist.
- Den Kontexttyp aus `gateway.ts` importieren, nicht aus `bootstrap.ts`.

### Starteihenfolge

1. `files` — trägt Datei-I/O-Capability bei
2. `logging` — trägt `logging:log` bei
3. `db` — trägt `db:executor` und `db:type` bei
4. Alle übrigen Gateways — alphabetisch sortiert

## Erweiterungspunkte

Neuen Adapter hinzufügen:

1. `src/adapters/<gateway-id>/<adapter-id>/` erstellen.
2. `package.json` mit `name`, `version` und `main` hinzufügen.
3. `bootstrapFooAdapter(ctx)` exportieren.
4. `docs/index.en.md` und Sprachvarianten hinzufügen.
5. Tests unter `tests/` hinzufügen.

Neues Gateway hinzufügen:

1. `src/gateways/<id>/` mit `manifest.json`, `bootstrap.ts` und `gateway.ts` erstellen.
2. `docs/index.en.md` und Sprachvarianten hinzufügen.
3. Eintrag in `src/docs/index.<lang>.md` unter der Gateways-Tabelle hinzufügen.
