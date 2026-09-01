# Einheitliche Änderungen sozialer Mitgliedschaften

**Feature-Zweig:** feature-document-api-standard-for-membership-changes

## Einfache Mitgliedschafts-APIs und Capabilities

Chatraum-Mitglieder und Profil-Follower verwenden nun eine dokumentierte `POST`-/`DELETE`-Konvention für Sammlungen sowie passende `ctx`-Capabilities für vertrauenswürdige Komponentenintegration.

## Mitgliedschafts-Capability für Module exportiert

Der Messages-Adapter veröffentlicht die Chatraum-Mitgliedschaft jetzt sowohl über den System-`ctx` als auch über den Capability-Speicher des Gateways. Externe Module wie Jitsi Meet können sie dadurch beim Aktivieren und Starten auflösen.

## Commits

- [a8b044c](https://github.com/Cognis-Labs-HQ/Cognis/commit/a8b044c024072a91dc63741698588d762418d0b3)
