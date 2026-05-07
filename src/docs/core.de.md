# Core

## Übersicht

`src/core/` ist die Grundlageschicht von Cognis. Sie enthält anbieterneutrale Verträge, Schnittstellen und Richtliniendienste, von denen der Rest der Plattform abhängt. Core definiert, welche Fähigkeiten existieren und welche Regeln sie regeln — es enthält niemals eine konkrete Implementierung dieser Fähigkeiten.

Die kritische Regel ist, dass Core niemals aus Gateway- oder Adapter-Code importiert. Der Abhängigkeitspfeil zeigt immer nach innen: Gateways importieren aus Core; Core weiß nicht, dass Gateways existieren. Diese Invariante hält Core stabil und isoliert testbar, und stellt sicher, dass das Austauschen eines Gateways oder Adapters die Vertragsschicht nicht brechen kann.

Core stellt derzeit zwei Dienste und vier Capability-Namespaces bereit. Diese sind absichtlich minimal — die Design-Philosophie ist, dass Domain-Logik in Gateways lebt, nicht in Core. Core beschäftigt sich mit Lebenszyklus (Module), Gesundheitsberichten und der Definition der gemeinsamen Schnittstellen, die Gateways implementieren.

## Verantwortlichkeiten

- Die Schnittstellen `DatabaseGateway`, `FileStorageGateway`, `AuthAccountStore`, `AuthContext` und andere plattformübergreifende Schnittstellen definieren, die von Gateways verwendet werden.
- `ModuleService` für das Modul-Lebenszyklus-Management bereitstellen (Erkennung, Aktivierung, Deaktivierung, Zeigerschreiben, Routensicherheit).
- `HealthService` für Plattformgesundheit und Betriebszeitmetadaten bereitstellen.
- Den `ModuleManifest`-Vertrag definieren, den alle Module erfüllen müssen.
- Die Capability-Namespaces `system:health`, `auth:accounts`, `modules:lifecycle` und `ui:shell` bereitstellen.

Nicht verantwortlich für: Authentifizierung implementieren, Daten speichern, Benachrichtigungen senden oder jede Operation, die einen Anbieter-SDK berührt.

## Architektur

### Wichtige Quellpfade

| Pfad | Zweck |
| ---- | ----- |
| `src/core/contracts/auth-account.ts` | `AuthAccount`-, `ExternalIdentity`-, `AuthAccountStore`-Schnittstellen |
| `src/core/contracts/module-manifest.ts` | `ModuleManifest`-Schnittstelle |
| `src/core/services/module-service.ts` | `ModuleService`-Klasse |
| `src/core/services/health-service.ts` | `HealthService`-Klasse |
| `src/core/services/gateway-service.ts` | Gateway-Registry-Dienst |
| `src/core/index.ts` | Öffentliche Exporte für das `@cognis/core`-Paket |

### ModuleService

`ModuleService` in `src/core/services/module-service.ts` regelt den vollständigen Modul-Lebenszyklus. Es operiert auf einer `ModuleRuntimeGateway`-Abstraktion und einem optionalen `ModulePathResolver`. Wenn ein Pfad-Resolver vorhanden ist, schreiben und entfernen Aktivierungs-/Deaktivierungsoperationen Zeigerdateien (nginx-Stil-`<id>.load`-Symlinks), die entweder auf ein vertrauenswürdiges internes Verzeichnis oder ein Laufzeit-Extraktionsverzeichnis für externe Archive zeigen.

Vor der Aktivierung eines Moduls setzt `ModuleService` zwei Sicherheitsmaßnahmen durch:

- Core-Module (`class: "core"` im Manifest) können zur Laufzeit nicht umgeschaltet werden.
- Externe Module erfordern eine explizite Haftungsausschluss-Bestätigung, bevor der Zeiger geschrieben wird.

Routensicherheit wird vor der Aktivierung eines Moduls überprüft: Wenn die `routes.json` des Moduls einen Pfad unter einem geschützten Präfix deklariert (`/api/v1/system`, `/api/v1/auth`, `/api/v1/users`, `/public`, `/ui`), wird die Aktivierung abgelehnt.

```ts
// src/core/services/module-service.ts
export class ModuleService {
  async enable(moduleId: string, options?: { acknowledgeExternalDisclaimer?: boolean }): Promise<{ moduleId: string; enabled: boolean }>;
  async disable(moduleId: string): Promise<{ moduleId: string; enabled: boolean }>;
  async list(): Promise<ModuleManifest[]>;
}
```

### HealthService

`HealthService` in `src/core/services/health-service.ts` zeichnet die Serverstartzeit auf und gibt bei Bedarf ein `HealthStatus`-Objekt zurück. Es ist zustandslos außer dem Startzeitstempel.

```ts
export interface HealthStatus {
  status: 'ok';
  timestamp: string;
  startedAt: string;
  uptimeMs: number;
}
```

### AuthAccountStore-Schnittstelle

`AuthAccountStore` in `src/core/contracts/auth-account.ts` ist die Schnittstelle, die Auth-Adapter für die Account-Persistenz implementieren müssen. Sie umfasst das Finden von Konten anhand externer Identitäten, das Erstellen externer Konten und das Erstellen lokaler Konten.

```ts
export interface AuthAccountStore {
  findByExternalIdentity(provider: string, externalUserId: string): Promise<AuthAccount | null>;
  createExternalAccount(identity: ExternalIdentity): Promise<AuthAccount>;
  updateExternalAccount(accountId: string, identity: ExternalIdentity): Promise<AuthAccount>;
  createLocalAccount(input: { username: string; passwordHash: string; email?: string; isAdmin?: boolean }): Promise<AuthAccount>;
}
```

### Capability-Namespaces

| Capability | Besitzer | Beschreibung |
| ---------- | -------- | ------------ |
| `system:health` | Core / Systemrouten | Stellt Plattformgesundheit und Betriebszeit über `GET /api/v1/system/health` bereit |
| `auth:accounts` | Auth-Gateway | Eingebauter Account-Lebenszyklus und Authentifizierungsrichtlinienverkabelung |
| `modules:lifecycle` | Modulrouten | Modullisting, Aktivierungs-/Deaktivierungssteuerungen und Richtlinienprüfungen |
| `ui:shell` | UI-Routen | Gemeinsames Anwendungsshell-Routing und Admin-Betriebsoberfläche |
