# Technische Referenz

Core definiert ctx-Ausführung, Komponentenlebenszyklen und anbieterneutrale Typverträge.

## Schnittstellen

`createCtx()` stellt Capabilities und gestufte Flows bereit. `ctx.flow.exists`, `extend` und `run` arbeiten mit benannten Flows; Ergebnisse enthalten `data` und `stageResults`. `system:contracts` ist das versionierte Laufzeitregister; Fachkomponenten definieren dort ihre Verträge. `AuthAccountStore`, `AccessRole` und `RoleAccessPolicy` sind exportierte Typen, keine automatisch registrierten Capability-IDs.

## Konfiguration

Der Host liefert Speicher und Register. Modulmanifeste deklarieren stabile UUIDs, Abhängigkeiten und Einstiegspunkte. Datenbankverbindungen gehören zu [DB](/docs/gateways/db/technical), Rollenordnung und exakte Rollenprüfung zu [Zugriffsregeln](/docs/acl-matrix/technical).

## Verhalten

Gateway- und Moduldienste laden Beiträge in Eigentümerbereichen. Aufräumen entfernt Registrierungen; fehlgeschlagener Bootstrap rollt sie zurück. Ein Flow führt seine deklarierten Stufen der Reihe nach aus und sammelt Ergebnisse für folgende Handler. Installation, Aktivierung und Entfernung verwenden den Host-Lebenszyklus statt fremder Implementierungsimporte.

## Sicherheit

Lebenszyklus und strukturelle Vertragsauflösung autorisieren keine Ressourcenoperation. Der Eigentümer prüft Konto, Rolle und Ressource vor geschützter Arbeit. Externe Module erhalten begrenzte öffentliche Verträge statt uneingeschränkter Host-Interna.

## Referenz

- [src/core/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/index.ts)
- [src/core/ctx/types.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/ctx/types.ts)
- [src/core/contracts/auth-account.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/contracts/auth-account.ts)
- [src/core/contracts/access-policy.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/contracts/access-policy.ts)
