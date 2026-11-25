# Technische Referenz

Study erkennt aktive Sprachbeschreibungen und zeigt deren registrierte Inhalte in den Lernoberflächen des Hosts.

## Schnittstellen

Der Study-Bootstrap erkennt Capabilities namens `study:language:<code>` aktiver Module. Beschreibungen liefern `code`, `name`, `flag`, `version`, optional `moduleId` und `childComponents`. Kindeinträge enthalten `id`, `label` oder `labelKey`, `pageUrl`, optionale Skripte/Stile, Reihenfolge und Mindestrolle.

## Konfiguration

Externe Pakete werden über [Module](/docs/modules/external/usage) installiert und aktiviert. Die Auswahl der Lernsprachen gehört zum Konto. Inhaltsschemata und Importe gehören zu [Library](/docs/adapters/study/library/technical); [Study](/docs/gateways/study/technical) besitzt Navigation und Anbieterlebenszyklen.

## Verhalten

Die Synchronisierung registriert verfügbare Sprachen und aktualisiert Kindrouten bei Anbieteränderungen. Host-Explore-Seiten benötigen keine eigene Browserseite pro Sprache. Ebenen nutzen ihren deklarierten Navigationsschlüssel. Anbieter liefern Sprachdaten; Host-Clients steuern gemeinsame Suche, Favoriten und Übungsflows.

## Sicherheit

Eine Sprachbeschreibung gewährt keine Klassenmitgliedschaft oder Inhaltsrechte. Sichtbarkeit, kanonische Referenzen, geschützte Änderungen und Belohnungen werden von den zuständigen Adaptern geprüft. Deaktivierung entfernt die Verfügbarkeit; ausstehende Browserarbeit folgt dem Seiten-/Anbietersignal.

## Referenz

- [src/gateways/study/bootstrap.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/study/bootstrap.ts)
- [src/gateways/study/gateway.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/study/gateway.ts)
- [src/adapters/study/library/contracts.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/study/library/contracts.ts)
