# Typisierte Social-Verträge

**Feature-Zweig:** feature-social-files-type-contracts

## Typisierte Speicherung und Routen

Rollen und Sichtbarkeitsdeklarationen sozialer Profile entsprechen jetzt den gespeicherten Datensätzen. Nachrichten- und Profilrouten behalten ihre Berechtigungsprüfungen bei; Rückrufe, Benachrichtigungen und Datenbankbefehle verwenden explizite Verträge. Fehlt die Auflösung der Gastsitzung, schlägt der Vorgang weiterhin vor dem Lesen des Gastprofils fehl.

## Isolierte Vertragstests

Profiltests verwenden eine komponenteneigene strukturierte Datenbanknachbildung mit Transaktionen. Tests prüfen die verweigerte Mitgliederverwaltung für Gäste und Nichtmitglieder. Files-ACL-Tests geben die aufrufende Komponente explizit an; Namensraumidentität und Zugriffsregeln bleiben unverändert.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/7629b15df776f93d33a6ef423aab750de61a28a6
- https://github.com/Cognis-Labs-HQ/Cognis/commit/7aee693c7a0d3e82cf7e5744c46406f1cb3c41e9
