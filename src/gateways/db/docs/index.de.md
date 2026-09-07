# Datenbank-Gateway

## Überblick

Das Datenbank-Gateway ist der einzige Zugangspunkt für alle Datenbankoperationen in Cognis. Es stellt eine einheitliche Executor-Schnittstelle bereit, die die Unterschiede zwischen PostgreSQL und MariaDB verbirgt. Das Gateway liest `DB_TYPE` aus der Umgebung, erstellt den entsprechenden Executor, initialisiert das Schema und trägt Executor und Dialekt-Helfer zum Capability-Store bei.

Kein Komponente außerhalb des Datenbank-Gateway-Baums — kein Route-Handler, kein Gateway-Bootstrap, kein Modul — sollte eine Datenbankverbindung direkt herstellen oder einen Treiber aufrufen. Alle Datenbankzugriffe erfolgen über die `db:executor`-Capability oder die höherstufigen Store-Abstraktionen in `src/adapters/db/reuse/`.

## Verantwortlichkeiten

- `DB_TYPE` lesen und beim Bootstrap die korrekte `DbExecutor`-Instanz erstellen.
- Das Datenbankschema initialisieren durch Ausführen der SQL-Init- und Migrationsskripts.
- `db:executor`, `db:type` und `db:dialect` zum Capability-Store beitragen.
- Die `modules`-Tabelle mit dem `cognis-core`-Modulrekord befüllen.

## Architektur

### DatabaseGateway-Schnittstelle

```ts
export interface DatabaseGateway {
    query<Row = Record<string, unknown>>(
        statement: string,
        params?: unknown[],
    ): Promise<QueryResult<Row>>;
    execute(
        statement: string,
        params?: unknown[],
    ): Promise<{ affectedRows: number }>;
    transaction<T>(callback: (db: DatabaseGateway) => Promise<T>): Promise<T>;
}
```

### DbDialectHelper

Der `DbDialectHelper`, beigetragen als `db:dialect`, stellt zwei Methoden bereit:

```ts
export interface DbDialectHelper {
    upsert(
        table: string,
        keyCol: string,
        keyVal: unknown,
        extraData: Record<string, unknown>,
    ): Promise<void>;
    insertIgnore(table: string, data: Record<string, unknown>): Promise<void>;
}
```

| Pfad                           | Zweck                                       |
| ------------------------------ | ------------------------------------------- |
| `src/gateways/db/gateway.ts`   | `DatabaseGateway`-Schnittstelle             |
| `src/gateways/db/executor.ts`  | `createDbExecutor`                          |
| `src/gateways/db/init.ts`      | `initializeDatabaseSchema`                  |
| `src/gateways/db/bootstrap.ts` | Bootstrap-Einstiegspunkt; `DbDialectHelper` |

## Administration

Die Administration markiert nur den durch `DB_TYPE` ausgewählten Adapter als aktiv. Jeder Datenbankadapter ist gesperrt, da sein Zustand durch das ausgewählte Docker-Compose-Treiberprofil statt durch einen Schalter in der Anwendung verwaltet wird. Die Überschrift des Datenbank-Gateways zeigt diese Zuständigkeit in einem Informationstooltip an.

## Konfiguration

| Variable       | Standard     | Beschreibung                                                          |
| -------------- | ------------ | --------------------------------------------------------------------- |
| `DB_TYPE`      | `postgresql` | Datenbank-Backend: `postgresql` oder `mariadb`                        |
| `DATABASE_URL` | —            | Verbindungszeichenkette; erforderlich für `postgresql` oder `mariadb` |
