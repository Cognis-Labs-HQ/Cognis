import type { DatabaseGateway, QueryResult } from "@cognis/core";
import {
    buildStructuredDbCommandStatement,
    type StructuredDbCommand,
    type StructuredDbCommandResult,
    type StructuredDbDialect,
} from "../../../gateways/db/reuse/db-command.js";

export interface PostgresQueryResult<Row = Record<string, unknown>> {
    rows: Row[];
    rowCount: number;
}

export interface PostgresClient {
    query<Row = Record<string, unknown>>(
        sql: string,
        params?: unknown[],
    ): Promise<PostgresQueryResult<Row>>;
}

const POSTGRESQL_STRUCTURED_DB_DIALECT: StructuredDbDialect = {
    createPlaceholder(parameterIndex) {
        return `$${parameterIndex}`;
    },
    buildInsertPrefix() {
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
            const target =
                conflictTarget.length > 0
                    ? ` (${conflictTarget.join(", ")})`
                    : "";
            return ` ON CONFLICT${target} DO NOTHING`;
        }
        const assignments = updateEntries.map(([column, value]) =>
            hasExplicitUpdate
                ? `${column} = ${addParameter(value)}`
                : `${column} = EXCLUDED.${column}`,
        );
        return ` ON CONFLICT (${conflictTarget.join(", ")}) DO UPDATE SET ${assignments.join(", ")}`;
    },
};

export class PostgresDbGateway implements DatabaseGateway {
    constructor(private readonly client: PostgresClient) {}

    async executeCommand<Row = Record<string, unknown>>(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult<Row>> {
        const statement = buildStructuredDbCommandStatement(
            command,
            POSTGRESQL_STRUCTURED_DB_DIALECT,
        );
        const result = await this.client.query<Row>(
            statement.sql,
            statement.params,
        );
        return { rows: result.rows, rowCount: result.rowCount };
    }

    async query<Row = Record<string, unknown>>(
        statement: string,
        params?: unknown[],
    ): Promise<QueryResult<Row>> {
        const result = await this.client.query<Row>(statement, params);
        return { rows: result.rows, rowCount: result.rowCount };
    }

    async execute(
        statement: string,
        params?: unknown[],
    ): Promise<{ affectedRows: number }> {
        const result = await this.client.query(statement, params);
        return { affectedRows: result.rowCount ?? 0 };
    }

    async transaction<T>(
        callback: (db: DatabaseGateway) => Promise<T>,
    ): Promise<T> {
        await this.client.query("BEGIN");
        try {
            const result = await callback(this);
            await this.client.query("COMMIT");
            return result;
        } catch (error) {
            await this.client.query("ROLLBACK");
            throw error;
        }
    }
}
