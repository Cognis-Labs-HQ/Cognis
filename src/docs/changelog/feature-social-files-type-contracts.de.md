# Typisierte Social-Verträge

**Feature-Zweig:** feature-social-files-type-contracts

## Typisierte Speicherung und Routen

Rollen und Sichtbarkeitsdeklarationen sozialer Profile entsprechen jetzt den gespeicherten Datensätzen. Nachrichten- und Profilrouten behalten ihre Berechtigungsprüfungen bei; Rückrufe, Benachrichtigungen und Datenbankbefehle verwenden explizite Verträge. Fehlt die Auflösung der Gastsitzung, schlägt der Vorgang weiterhin vor dem Lesen des Gastprofils fehl.

## Isolierte Vertragstests

Profiltests verwenden eine komponenteneigene strukturierte Datenbanknachbildung mit Transaktionen. Tests prüfen die verweigerte Mitgliederverwaltung für Gäste und Nichtmitglieder. Files-ACL-Tests geben die aufrufende Komponente explizit an; Namensraumidentität und Zugriffsregeln bleiben unverändert.

## Commits

- [4c9af91f2455a5551bd1ef8474a0476c7cc962d9](https://github.com/Cognis-Labs-HQ/Cognis/commit/4c9af91f2455a5551bd1ef8474a0476c7cc962d9)
- [c226a2ba265d8c855a33889ac8a47ef3cc1a9399](https://github.com/Cognis-Labs-HQ/Cognis/commit/c226a2ba265d8c855a33889ac8a47ef3cc1a9399)
