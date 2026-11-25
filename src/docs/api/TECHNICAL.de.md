# Technische Referenz

Der HTTP-Host verteilt registrierte Routen und stellt Komponentenerkennung sowie versionierte Dokumentation bereit.

## Schnittstellen

`GET /api/v1/system/healthcheck` ist die einfache Erreichbarkeitsprüfung. `GET /api/v1/system/health` enthält den Komponentenstatus. `GET /api/v1/ui/capability-providers` filtert nach Sitzung und Zugriffsregeln; anonyme Aufrufer erhalten ausdrücklich öffentliche Anbieter ohne Rollenanforderung.

Dokumentmethoden, Antwortfelder und Sprachauswahl stehen in der [Serverreferenz](/docs/components/api/technical). Fachendpunkte gehören unter anderem [Auth](/docs/gateways/auth/technical), [Calendar](/docs/gateways/calendar/technical) und [Share](/docs/gateways/share/technical).

## Konfiguration

Der Quellbetrieb liest `PORT` (Standard `3000`) und `LISTEN_HOST` (Standard `0.0.0.0`). `COGNIS_GATEWAYS_ROOT` und `COGNIS_ADAPTERS_ROOT` überschreiben die Suchpfade. Container- und Verbindungsparameter stehen in [DevOps](/docs/devops/technical), Treibereinstellungen bei [DB](/docs/gateways/db/technical).

## Verhalten

Der Bootstrap lädt Gateway-Routen und UI-Beschreibungen. Host-Routen verteilen HTTP-Anfragen; Fachkomponenten prüfen Eingaben, Speicherung und Rechte. Browsererkennung berücksichtigt die Sitzung und wird bei Identitätswechsel erneuert. Die öffentliche Erreichbarkeitsprüfung führt keine langsamen optionalen Statusbeiträge aus.

## Sicherheit

Vor geschützter Arbeit werden Sitzung, Bearer-Claims und Routenrichtlinie geprüft. Rollen ersetzen keine Ressourcenprüfung. Zugangsdaten, private Daten und Autorisierungsentscheidungen gehören nicht in öffentliche Dokumente oder Diagnose-URLs.

## Referenz

- [src/api/main.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/main.ts)
- [src/api/server.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/server.ts)
- [src/api/reuse/route-registry.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/reuse/route-registry.ts)
- [src/api/routes/docs/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/routes/docs/index.ts)
