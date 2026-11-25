# Technische Referenz

Der Gateway-Bootstrap verbindet öffentliche Fachverträge, Routen und optionale Adapter mit dem Host.

## Schnittstellen

`bootstrap(ctx)` erhält den `GatewayBootstrapContext` mit Capability-, Routen-, Gateway- und UI-Registern, Flow-Zugriff, Adapterpfad und Protokollierung. Ein Gateway deklariert versionierte Fachverträge über `system:contracts`; Adapter können mit `defineContracts(ctx)` eigene Verträge deklarieren.

## Konfiguration

`COGNIS_GATEWAYS_ROOT` und `COGNIS_ADAPTERS_ROOT` bestimmen die Suchpfade. Das Gateway-Manifest enthält `id`, unveränderliche `uuid`, `version` und UUID-basierte `requires`. `documentation` verweist auf die lokalisierten Dateien `docs/README.en.md`, `docs/USAGE.en.md` und `docs/TECHNICAL.en.md`. Der [Dokumentstandard](/docs/standard/technical) definiert die Übersetzungen.

## Verhalten

GatewayService findet die Bootstrap-Einstiege und bestimmt die Abhängigkeitsreihenfolge. Laufzeitversionen stammen aus `readGatewayManifestVersion`, nicht aus einem zweiten Literal. Registrierungen gehören zum Bootstrap-Bereich und werden bei Fehlern zurückgerollt. Adapter erhalten ihren fachbezogenen Kontext; Hooks und Factories unterscheiden sich je nach Gateway. Abläufe stehen in [Anwendung](/docs/gateways/usage).

## Sicherheit

Verbraucher verwenden öffentliche Capabilities oder benannte Flows statt fremder Implementierungsimporte. Erforderliche Verträge müssen verfügbar sein. Routen und Änderungen prüfen Konto- und Ressourcenrechte in ihrer Fachkomponente.

## Referenz

- [src/gateways/shared.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/shared.ts)
- [src/core/services/gateway-service.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/services/gateway-service.ts)
- [src/gateways/reuse/manifest-version.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/reuse/manifest-version.ts)
- [src/gateways/reuse/adapter-bootstrap.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/reuse/adapter-bootstrap.ts)
