# Technische Referenz

Cognis trennt Host-Orchestrierung, Fachgateways, Adapter und extern installierte Module.

## Schnittstellen

[Core](/docs/core/technical) exportiert ctx und Lebenszyklusverträge, [API](/docs/api/technical) verteilt HTTP-Anfragen. [Gateways](/docs/gateways/technical) registrieren Fachaktionen; [Adapter](/docs/adapters/technical) implementieren anbieter- oder fachspezifisches Verhalten. Profile und Messages sind Social-Adapter. Browserbeiträge verwenden [UI](/docs/ui/technical)-Verträge.

## Konfiguration

Die Host-Umgebung bestimmt Gateway-/Adapterpfade, Datenbank und Speicher. Administration wählt aktive optionale Komponenten. Externe Quellen und Installation beschreibt [Modules](/docs/modules/external/technical); Kontopräferenzen wählen keine Serverdatenbank.

## Verhalten

Manifeste bestimmen die Abhängigkeitsreihenfolge. Bootstrap trägt öffentliche Funktionen, Flows, Routen und UI-Metadaten bei. Verbraucher lösen Registrierungen auf statt fremder Implementierungsimporte. Eigentümerbereiche entfernen fehlgeschlagene oder deaktivierte Beiträge. Docs erkennt vollständige lokalisierte Pakete und Versionen aus öffentlichen Metadaten.

## Sicherheit

Architekturschichten bestimmen Eigentum, keine pauschalen Rechte. Konten, Freigabegäste und externe Module folgen getrennten Richtlinien. Ressourcenoperationen prüfen die aktuelle Autorisierung ihres Eigentümers.

## Referenz

- [src/core/ctx/types.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/ctx/types.ts)
- [src/api/bootstrap/gateway.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/bootstrap/gateway.ts)
- [src/gateways/shared.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/shared.ts)
