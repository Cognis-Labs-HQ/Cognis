# Modul-Framework

## Übersicht

Das Cognis-Modul-Framework ermöglicht es Drittanbieter- und Community-Entwicklern, die Plattform mit neuen Lernmodi, Integrationen und UI-Seiten zu erweitern, ohne den Kern zu verändern. Module sind eigenständige Verzeichnisse oder Archive, die eine `manifest.json` deklarieren, API-Routen registrieren, UI-Seiten bereitstellen und optional CLI-Unterbefehle hinzufügen. Kernmodule (`class: "core"`) werden mit der Plattform ausgeliefert und können nicht umgeschaltet werden. Erweiterungsmodule können zur Laufzeit über die Admin-API oder `cognisctl` aktiviert, deaktiviert, installiert und entfernt werden.

## Verantwortlichkeiten

- Modulmanifeste aus `COGNIS_MODULES_ROOT` (Standard `src/modules`) erkennen und laden.
- `enable`- und `disable`-Operationen über das `ModuleRuntimeGateway`-Interface bereitstellen.
- Jedes aktivierte Modul über den Bootstrap-Einstiegspunkt (`entrypoints.bootstrap`) laden und alle Modulfunktionen über ctx bereitstellen.
- Blockieren, dass Modulrouten geschützte Systempräfixe überschreiben.
- Registrierte Modulrouten aktualisieren, wenn Module aktiviert oder deaktiviert werden.

Nicht verantwortlich für: die Bereitstellung modulspezifischer Datenpersistenz (Module nutzen die `db:executor`-Fähigkeit) oder das Rendern von Modul-UI-Seiten (Module liefern ihre eigenen HTML-Einstiegspunkte über `entrypoints.ui`).

## Architektur

### Modulerkennung

Beim Start durchsucht `ModuleService` das Verzeichnis `COGNIS_MODULES_ROOT` nach Verzeichnissen mit einer `manifest.json`. Jedes gültige Manifest wird in ein `ModuleManifest`-Objekt geparst.

**nginx-Aktivierungsstil:** Ein aktiviertes Modul wird durch eine `.load`-Zeigerdatei unter `{modulesRoot}/{moduleId}.load` angezeigt. Das Erstellen der Datei aktiviert das Modul; das Löschen deaktiviert es. Dies spiegelt das nginx-Muster mit `sites-enabled`-Symlinks wider und bedeutet, dass die Aktivierung/Deaktivierung eines Moduls eine Dateisystemoperation ist, die Prozessneustarts überlebt.

### Interne und externe Module

| Typ        | Quelle                                       | Installation                               | Haftungsausschluss             |
| ---------- | -------------------------------------------- | ------------------------------------------ | ------------------------------ |
| `internal` | Im Repository unter `src/modules/` gebündelt | Vorinstalliert                             | Keiner                         |
| `external` | Hochgeladenes `.zip`- oder `.tar.gz`-Archiv  | Über Admin-API oder `component:import` CLI | Wird vor Aktivierung angezeigt |

Externe Module werden durch Hochladen eines komprimierten Archivs installiert. Das Framework entpackt das Archiv, prüft die `manifest.json` und legt das Modulverzeichnis unter `COGNIS_MODULES_ROOT` ab.

### ModuleManifest-Vertrag

```ts
export interface ModuleManifest {
    id: string;
    name: string;
    version: string;
    publisher?: string;
    class: "core" | "extension";
    coreApiVersion: string;
    capabilities: string[];
    requires?: string[];
    entrypoints: {
        bootstrap?: string;
        api?: string;
        ui?: string;
        cli?: string;
        db?: string;
    };
}
```

Module mit `class: 'core'` können nicht über die API deaktiviert werden. `requires` listet Gateway-IDs auf, die aktiv sein müssen, damit das Modul funktioniert; die Admin-UI fordert dazu auf, deaktivierte Abhängigkeiten zu aktivieren, bevor das Modul aktiviert wird.

### Frontend-Vertrag

Module mit `entrypoints.ui` müssen ihre Seite unter dem deklarierten Pfad relativ zum Modulverzeichnis bereitstellen. Die Plattform fügt das standardmäßige `<script src="/ui/main.js">` und `<link rel="stylesheet" href="/ui/styles.css">` ein, und die Modulseite rendert in der gemeinsamen Shell.

### API-Routen-Registrierung

```ts
export function registerApiRoutes(router) {
    router.get(
        "/api/v1/modules/my-module/data",
        async (req, res) => {
            // handler
        },
        { access: { minRole: "moderator" } },
    );
    router.post(
        "/api/v1/modules/my-module/admin-audit",
        async (req, res) => {
            // handler
        },
        { access: { onlyRole: "owner" } },
    );
}
```

`createModuleExtensionRoutes` in `src/modules/routes/module-extensions.ts` lädt aktivierte Module primär über `entrypoints.bootstrap`. Der Bootstrap erhält ein ctx-Objekt (`moduleId`, `moduleRoot`, `getCapability`, `router`, `registerApiGet`, `registerApiPost` und UI-Registrierungsmethoden) und ist die einzige erlaubte Integrationsoberfläche.

Direkte Cross-Module- oder Core-zu-Modul-Imports sind verboten. Fähigkeitsaustausch muss über ctx laufen.

Jede Modulroute kann optionale Zugriffsrichtlinien über das dritte
Router-Argument deklarieren:

- `access.minRole` — erlaubt die Zielrolle und alle höheren Rollen
  (`user < teacher < moderator < admin < owner`)
- `access.onlyRole` — erlaubt genau eine einzelne Rollengruppe

### Geschützte Routenpräfixe

Modulrouten dürfen nicht mit einem der folgenden Präfixe beginnen:

| Präfix           | Grund                   |
| ---------------- | ----------------------- |
| `/api/v1/system` | Kernsystem-Endpunkte    |
| `/api/v1/auth`   | Auth-Gateway            |
| `/api/v1/users`  | Benutzerverwaltung      |
| `/public`        | Plattform-Static-Assets |
| `/ui`            | Plattform-UI-Assets     |

Der Versuch, eine Route unter einem geschützten Präfix zu registrieren, blockiert die Modulaktivierung.

`routes.json` unterstützt sowohl reine Routen-Strings als auch Routenobjekte
mit Zugriffsrichtlinien für UI-Seiten:

```json
[
    "/api/v1/modules/my-module/data",
    { "path": "/my-module/page", "access": { "minRole": "admin" } },
    { "path": "/my-module/owner-audit", "access": { "onlyRole": "owner" } }
]
```

## Konfiguration

| Variable              | Standard                          | Beschreibung                                                    |
| --------------------- | --------------------------------- | --------------------------------------------------------------- |
| `COGNIS_MODULES_ROOT` | `src/modules` (aus cwd aufgelöst) | Verzeichnis, das nach Modul-Unterverzeichnissen durchsucht wird |

## API-Routen

| Methode | Pfad                            | Beschreibung                                               | Auth   |
| ------- | ------------------------------- | ---------------------------------------------------------- | ------ |
| `GET`   | `/api/v1/modules`               | Alle installierten Module mit Aktivierungsstatus auflisten | Bearer |
| `POST`  | `/api/v1/modules/:id/enable`    | Modul aktivieren                                           | Admin  |
| `POST`  | `/api/v1/modules/:id/disable`   | Modul deaktivieren                                         | Admin  |
| `POST`  | `/api/v1/modules/install`       | Modul aus hochgeladenem Archiv installieren                | Admin  |
| `POST`  | `/api/v1/modules/import/github` | Modularchiv aus einem GitHub-Repository-Tag importieren    | Admin  |

## GitHub-Import-Lebenszyklus

1. Admin übergibt `repositoryUrl` und `versionTag` über die Administration-UI oder `cognisctl component:import`.
2. Die API-Route `/api/v1/modules/import/github` validiert die Eingaben und delegiert an `ModuleService.importFromGithub`.
3. Der Service lädt das Tag-Archiv von `codeload.github.com` und übergibt die Bytes an das ModuleRuntimeGateway.
4. Die Runtime installiert das Archiv als standardkonformes Drop-in-Modulverzeichnis.
5. Admin aktiviert das Modul anschließend über den normalen `/enable`-Flow.

## Kanonisches Layout für neue Module

Neue oder neu organisierte Module sollen auf dieses Wurzel-Layout zusammenlaufen:

```text
src/modules/my-module/
  manifest.json
  routes.json
  bootstrap.ts
  docs/
    index.en.md
    index.de.md
    index.ja.md
    index.id.md
  api/
    index.ts
  ui/
  media/
  cli/
    index.js
  db/
```

Erforderlich:

- `manifest.json` (Identität, Fähigkeiten, Entry-Points, Abhängigkeitsmetadaten)
- `routes.json` (deklarierte API/UI-Routen für Sicherheitsprüfungen)
- `bootstrap.js` oder `bootstrap.ts` (dünne ctx-Brücke, die das Modul an Runtime-Capabilities anbindet)
- `docs/index.<lang>.md` (Moduldokumentation mit dem standardisierten Komponenten-Einstiegsdateinamen)
- `ui/`-Verzeichnis (statische Assets; erforderlich, auch wenn die erste Version nur Shell-Hooks oder ruhende Seiten liefert)

Kanonisch, wenn das Modul Backend-Code bereitstellt:

- `api/index.js` oder `api/index.ts` (moduleigene Server-Handler und Helfer; `bootstrap.*` soll nur delegieren und nicht die gesamte Logik tragen)

Optionale Geschwisterverzeichnisse bei Bedarf:

- `cli/index.js` (CLI-Befehlsregistrierung)
- `db/` (Schema-Bootstrap oder Migrationen)
- `tests/` (modullokale automatisierte Abdeckung)
- `content/` (moduleigene statische Inhaltsbündel)
- `media/` (optionale Bilder oder Videos im Repository-Stamm für die horizontale Mediengalerie der Marketplace-Detailansicht; unterstützt werden SVG, PNG, JPEG, WebP, GIF, MP4, WebM und Ogg-Video)

Unterstützende Verzeichnisse dürfen neben `docs/`, `api/` und `ui/` liegen, dürfen diese stabilen Namen aber nicht durch benutzerdefinierte Alternativen ersetzen.
