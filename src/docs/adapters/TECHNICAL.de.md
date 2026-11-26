# Technische Referenz

Adapter stellen Implementierungen, Registrierungen und Konfiguration unter der Verantwortung ihres Gateways bereit.

## Schnittstellen

Ein Adapter liegt unter `src/adapters/<gateway>/<adapter>/`. Sein Paketeinstieg exportiert die vom Gateway verlangte Factory oder Bootstrap-Funktion. Optional deklariert `defineContracts(ctx)` eigene Laufzeitverträge über `system:contracts`.

## Konfiguration

Anbietereinstellungen stammen aus dem Konfigurationsschema und den Routen des zuständigen Gateways. Zugangsdaten, Aktivierung und Verbindungsanforderungen sind adapterspezifisch. [Gateway-Verträge](/docs/gateways/technical) beschreiben Erkennung und Lebenszyklus.

## Verhalten

Adapter dürfen eigene Fachspeicher, Routen und Oberflächen besitzen: Social Profile ist ein Adapter von Social, kein Gateway. Datenbanktreiber führen strukturierte Datenbankbefehle aus; Konto-, Profil- und Nachrichtenschemata gehören ihren Fachkomponenten. Registrierungen werden bei fehlgeschlagenem Laden oder Deaktivierung über den Eigentümerbereich entfernt.

## Sicherheit

Komponentenübergreifende Aktionen verwenden öffentliche ctx-Funktionen oder Flows. Ein Import oder aktivierter Adapter gewährt keine Benutzerrechte. Diagnosen dürfen keine Zugangsdaten offenlegen.

## Referenz

- [src/gateways/reuse/adapter-bootstrap.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/reuse/adapter-bootstrap.ts)
- [src/gateways/shared.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/shared.ts)
- [src/adapters/social/profile/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/social/profile/index.ts)
