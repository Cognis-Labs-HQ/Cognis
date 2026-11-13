# Typisierte Social-Verträge

**Feature-Zweig:** feature-social-files-type-contracts

## Typisierte Speicherung und Routen

Rollen und Sichtbarkeitsdeklarationen sozialer Profile entsprechen jetzt den gespeicherten Datensätzen. Nachrichten- und Profilrouten behalten ihre Berechtigungsprüfungen bei; Rückrufe, Benachrichtigungen und Datenbankbefehle verwenden explizite Verträge. Fehlt die Auflösung der Gastsitzung, schlägt der Vorgang weiterhin vor dem Lesen des Gastprofils fehl.

## Isolierte Vertragstests

Profiltests verwenden eine komponenteneigene strukturierte Datenbanknachbildung mit Transaktionen. Tests prüfen die verweigerte Mitgliederverwaltung für Gäste und Nichtmitglieder. Files-ACL-Tests geben die aufrufende Komponente explizit an; Namensraumidentität und Zugriffsregeln bleiben unverändert.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/ff7f3932e04aa47722da1841f1a891c550f240e2
