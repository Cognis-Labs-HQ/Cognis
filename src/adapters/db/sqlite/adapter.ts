import type { DatabaseGateway, QueryResult } from "@cognis/core";
import {
    buildStructuredDbCommandStatement,
    type StructuredDbCommand,
    type StructuredDbCommandResult,
} from "../../../gateways/db/reuse/db-command.js";

export interface SqliteRunResult {
    changes: number;
}

export interface SqliteClient {
    all<Row = Record<string, unknown>>(
        statement: string,
        params?: unknown[],
    ): Promise<Row[]>;
    run(statement: string, params?: unknown[]): Promise<SqliteRunResult>;
    exec(statement: string): Promise<void>;
}

export class SqliteDbGateway implements DatabaseGateway {
    constructor(private readonly client: SqliteClient) {}

    async executeCommand<Row = Record<string, unknown>>(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult<Row>> {
        const statement = buildStructuredDbCommandStatement(command, "sqlite");
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
        params?: unknown[],
    ): Promise<QueryResult<Row>> {
        const rows = await this.client.all<Row>(statement, params);
        return { rows, rowCount: rows.length };
    }

    async execute(
        statement: string,
        params?: unknown[],
    ): Promise<{ affectedRows: number }> {
        const result = await this.client.run(statement, params);
        return { affectedRows: result.changes ?? 0 };
    }

    async transaction<T>(
        callback: (db: DatabaseGateway) => Promise<T>,
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
