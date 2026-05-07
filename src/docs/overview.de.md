# Cognis – Überblick

## Übersicht

Cognis ist eine modulare Sprachlernplattform, die für unabhängige Lernende, Lehrkräfte und Gemeinschaften konzipiert wurde. Sie kombiniert strukturierte Lerninhalte mit sozialen Funktionen, Echtzeitkollaborationsbereitschaft und einer tief erweiterbaren Backend-Architektur. Das Ziel ist, die Bereitstellung einer selbst gehosteten Sprachlernumgebung zu erleichtern, die von einem einzelnen Benutzer zu einer vollständigen Gemeinschaft wachsen kann, ohne die Kern-Codebasis zu ändern.

Die Plattform basiert auf einer Gateway-First-Architektur: Jedes wichtige Subsystem (Authentifizierung, Benachrichtigungen, Profile, Dateispeicherung, Protokollierung) ist ein Gateway, das seine eigenen Routen, Adapter, UI-Beiträge, Tests und Dokumentation besitzt. Der Kern der Anwendung definiert Verträge und Richtlinien; er importiert niemals konkreten Gateway- oder Adapter-Code. Diese Trennung bedeutet, dass Sie ein neues Datenbank-Backend hinzufügen, einen Authentifizierungsanbieter tauschen oder ein Subsystem vollständig entfernen können, indem Sie nur die Konfiguration ändern, ohne gemeinsamen Code zu bearbeiten.

Adapter sind anbieterspezifische Implementierungen von Gateway-Schnittstellen. Jedes Gateway erkennt seine Adapter beim Start, indem es ein bekanntes Verzeichnis durchsucht, anstatt eine statische Importliste zu pflegen. Das Ergebnis ist, dass das Hinzufügen eines neuen Adapters — beispielsweise eines S3-basierten Dateispeicher-Adapters — nur das Platzieren des Adapter-Verzeichnisses an der richtigen Stelle erfordert; der Server stellt aus dem Vorhandenen den vollständigen Funktionsumfang zusammen.

Module erweitern die Plattform um optionale Funktionen: Inhaltstypen, Lehrpläne, Analysen oder Integrationen. Wie Gateways sind Module eigenständig und werden automatisch erkannt. Sie tragen CSS, HTML-Vorlagen und JavaScript-Verhalten zur Benutzeroberfläche über einen definierten Frontend-Vertrag bei und registrieren ihre eigenen API-Routen über einen geschützten Mechanismus, der Kollisionen mit Core-Namespaces verhindert.

## Verantwortlichkeiten

- Die Plattformgrundlage bereitstellen: HTTP-Server, Authentifizierung, Persistenz, Dateispeicherung, Protokollierung und Benachrichtigungsversand.
- Das Gateway/Adapter-Muster und den Capability-Store definieren, der Gateways miteinander verbindet.
- Die UI-Shell, den Page Composer und die i18n-Infrastruktur hosten.
- Den Modul-Lebenszyklus verwalten: Erkennung, Aktivierung und Routensicherheit.
- Den In-App-Dokumentationsbrowser aus automatisch erkannten `docs/`-Verzeichnissen bereitstellen.

Nicht verantwortlich für: spezifische Auth-Anbieterlogik (Adapter), spezifisches Datenbank-SQL (Adapter), spezifischer Benachrichtigungstransport (Adapter) oder von Modulen gelieferter Inhalt.

## Architektur

### Schichtenmodell

```
core/            — Verträge, Schnittstellen, Richtliniendienste
gateways/        — Domänen-Orchestratoren (auth, db, notify, profile, files, logging)
adapters/        — Konkrete Anbieterimplementierungen (sqlite, ldap, smtp usw.)
modules/         — Optionale Funktionserweiterungen
api/             — HTTP-Server, Routenregistry, Anfrage-/Antwortschicht
ui/              — Browser-Frontend (Seiten, Layouts, Reuse-Utilities, Styles)
```

Core definiert `DatabaseGateway`, `FileStorageGateway`, `AuthAccountStore` und andere Schnittstellen in `src/core/contracts/`. Gateways importieren aus Core; Core importiert niemals aus Gateways. Diese Einwegabhängigkeit ist die primäre Architekturinvariante.

Jedes Gateway hat eine `bootstrap(ctx)`-Funktion, die einen `GatewayBootstrapContext` empfängt. Der Kontext bietet Zugriff auf den Capability-Store (`ctx.capabilities`), die Routenregistry (`ctx.routeRegistry`), die Gateway-Registry (`ctx.gatewayRegistry`) sowie den aktuellen Datenbankausführer und -typ. Gateways tragen Capabilities zum Store bei (`ctx.capabilities.contribute('key', value)`) und andere Gateways rufen sie ab (`ctx.capabilities.get('key')`).

### Capability-Store

Der Capability-Store ist der Injektionsmechanismus, der Gateways ohne direkte Importe verbindet. Beispielsweise liest das Logging-Gateway `file:append` aus dem Capability-Store (bereitgestellt vom Files-Gateway) und übergibt es dem Logger, damit Log-Schreibvorgänge über die File-Gateway-Abstraktion laufen. Das Profil-Gateway liest `file:gateway` (ebenfalls von Files), um Avatar-Uploads zu handhaben.

### Automatische Erkennung

Gateways werden beim Start durch Scannen von `src/gateways/` erkannt. Jedes Gateway-Verzeichnis enthält eine `bootstrap.ts` und eine `manifest.json`. Der Server lädt Gateways in der Abhängigkeitsreihenfolge, die durch das `requires`-Feld in jedem Manifest bestimmt wird.

Adapter werden von jedem Gateway erkannt, indem es beim eigenen Bootstrap `src/adapters/<gateway-id>/` durchsucht. Weder Core noch der Server haben Kenntnis davon, welche Adapter installiert sind.

Module werden aus `src/modules/` (intern, vertrauenswürdig) und `COGNIS_MODULES_ROOT/external` (externe Archive, erfordern explizite Zustimmungsbestätigung) erkannt. Ein Zeigerdatei-Mechanismus (nginx-Stil-`<id>.load`-Symlinks) steuert, welche Module aktiv sind.

### Wichtige Quellpfade

| Bereich                      | Pfad                           |
| ---------------------------- | ------------------------------ |
| Core-Verträge                | `src/core/contracts/`          |
| Core-Dienste                 | `src/core/services/`           |
| HTTP-Server-Einstieg         | `src/api/main.ts`              |
| Routenregistry               | `src/api/route-registry.ts`    |
| Gemeinsame Gateway-Utilities | `src/gateways/shared.ts`       |
| Gateway-Bootstrapper         | `src/api/gateway-bootstrap.ts` |
| UI-Einstiegspunkte           | `src/ui/app/`                  |
| UI-Reuse-Utilities           | `src/ui/reuse/`                |
| Plattformdokumentationen     | `src/docs/`                    |

## Erweiterungspunkte

Cognis wird durch drei Mechanismen erweitert:

- **Gateways**: Fügen Sie ein Verzeichnis unter `src/gateways/` mit `bootstrap.ts` und `manifest.json` hinzu. Der Server erkennt es automatisch.
- **Adapter**: Fügen Sie ein Verzeichnis unter `src/adapters/<gateway-id>/` hinzu. Das zugehörige Gateway erkennt und lädt es.
- **Module**: Platzieren Sie ein Modulverzeichnis unter `src/modules/` (intern) oder ein Modularchiv unter dem konfigurierten externen Pfad. Aktivieren Sie es über die Admin-Oberfläche oder `cognisctl`.
