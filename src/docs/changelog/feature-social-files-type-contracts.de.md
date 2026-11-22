# Typisierte Social-Verträge

**Feature-Zweig:** feature-social-files-type-contracts

## Typisierte Speicherung und Routen

Rollen und Sichtbarkeitsdeklarationen sozialer Profile entsprechen jetzt den gespeicherten Datensätzen. Nachrichten- und Profilrouten behalten ihre Berechtigungsprüfungen bei; Rückrufe, Benachrichtigungen und Datenbankbefehle verwenden explizite Verträge. Fehlt die Auflösung der Gastsitzung, schlägt der Vorgang weiterhin vor dem Lesen des Gastprofils fehl.

## Isolierte Vertragstests

Profiltests verwenden eine komponenteneigene strukturierte Datenbanknachbildung mit Transaktionen. Tests prüfen die verweigerte Mitgliederverwaltung für Gäste und Nichtmitglieder. Files-ACL-Tests geben die aufrufende Komponente explizit an; Namensraumidentität und Zugriffsregeln bleiben unverändert.

## Commits

- [2e913c2810feec19fb4c08ead1c01fd2335a046f](https://github.com/Cognis-Labs-HQ/Cognis/commit/2e913c2810feec19fb4c08ead1c01fd2335a046f)
- [dc8cc7ab0a27286fbed63e53637c73a0ce5878d3](https://github.com/Cognis-Labs-HQ/Cognis/commit/dc8cc7ab0a27286fbed63e53637c73a0ce5878d3)
- [103bf368dd7f8931da2681a838e01e2d9980a4c2](https://github.com/Cognis-Labs-HQ/Cognis/commit/103bf368dd7f8931da2681a838e01e2d9980a4c2)
