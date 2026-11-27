import type { DatabaseGateway, QueryResult } from "@cognis/core";
import {
    buildStructuredDbCommandStatement as buildStructuredDatabaseCommandStatement,
    type StructuredDbCommand,
    type StructuredDbCommandResult,
    type StructuredDbDialect,
} from "../../../gateways/db/reuse/db-command.js";

export interface SqliteRunResult {
    changes: number;
}

export interface SqliteClient {
    all<Row = Record<string, unknown>>(
        statement: string,
        parameters?: unknown[],
    ): Promise<Row[]>;
    run(statement: string, parameters?: unknown[]): Promise<SqliteRunResult>;
    exec(statement: string): Promise<void>;
}

const SQLITE_STRUCTURED_DATABASE_DIALECT: StructuredDbDialect = {
    createPlaceholder() {
        return "?";
    },
    buildInsertPrefix(conflict) {
        if (
            conflict?.action === "ignore" &&
            (!conflict.target || conflict.target.length === 0)
        ) {
            return "INSERT OR IGNORE INTO";
        }
        return "INSERT INTO";
    },
    buildInsertConflictClause({
        conflict,
        conflictTarget,
        updateEntries,
        addParameter,
        hasExplicitUpdate,
    }) {
        if (conflict.action === "ignore") {
            if (conflictTarget.length === 0) {
                return "";
            }
            return ` ON CONFLICT (${conflictTarget.join(", ")}) DO NOTHING`;
        }
        const assignments = updateEntries.map(([column, value]) =>
            hasExplicitUpdate
                ? `${column} = ${addParameter(value)}`
                : `${column} = EXCLUDED.${column}`,
        );
        return ` ON CONFLICT (${conflictTarget.join(", ")}) DO UPDATE SET ${assignments.join(", ")}`;
    },
};

class SqliteDatabaseGateway implements DatabaseGateway {
    constructor(private readonly client: SqliteClient) {}

    async executeCommand<Row = Record<string, unknown>>(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult<Row>> {
        const statement = buildStructuredDatabaseCommandStatement(
            command,
            SQLITE_STRUCTURED_DATABASE_DIALECT,
        );
        if (statement.returnsRows) {
            const rows = await this.client.all<Row>(
                statement.sql,
                statement.params,
            );
            return { rows, rowCount: rows.length };
        }
        const result = await this.client.run(statement.sql, statement.params);
        return { rowCount: result.changes ?? 0 };
    }

    async query<Row = Record<string, unknown>>(
        statement: string,
        parameters?: unknown[],
    ): Promise<QueryResult<Row>> {
        const rows = await this.client.all<Row>(statement, parameters);
        return { rows, rowCount: rows.length };
    }

    async execute(
        statement: string,
        parameters?: unknown[],
    ): Promise<{ affectedRows: number }> {
        const result = await this.client.run(statement, parameters);
        return { affectedRows: result.changes ?? 0 };
    }

    async transaction<T>(
        callback: (database: DatabaseGateway) => Promise<T>,
    ): Promise<T> {
        await this.client.exec("BEGIN");
        try {
            const result = await callback(this);
            await this.client.exec("COMMIT");
            return result;
        } catch (error) {
            await this.client.exec("ROLLBACK");
            throw error;
        }
    }
}
export { SqliteDatabaseGateway as SqliteDbGateway };
