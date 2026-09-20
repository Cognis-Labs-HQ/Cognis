# Runtime-Status behoben

**Feature-Zweig:** feature-fix-missing-database-relations-error

## Gateway-Statuswerte haben jetzt eine Datenbanktabelle

Cognis erstellt die Tabelle für persistierte Gateway-Statuswerte nun während der Datenbankinitialisierung und stellt vor dem Wiederherstellen des Runtime-Status zusätzlich sicher, dass sie existiert. Dadurch meldet PostgreSQL beim Start nicht mehr, dass die Relation `gateways` fehlt.

## Registrierungseinladungen initialisieren ihr Schema vor Lesezugriffen

Der Adapter für Registrierungseinladungen stellt seine Token-Tabellen jetzt vor dem Auflisten, Ausstellen oder Widerrufen von Einladungen sicher, damit Administrationsseiten für Einladungen auf einer frischen Datenbank keine Fehler wegen fehlender Tabellen auslösen.

## Änderungen

- [e68cb5a](https://github.com/Cognis-Labs-HQ/Cognis/commit/e68cb5a51f989982b2cea69cb48496fffd9061ee)
