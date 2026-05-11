import type { DatabaseGateway, QueryResult } from "@cognis/core";
import {
    buildStructuredDbCommandStatement,
    type StructuredDbCommand,
    type StructuredDbCommandResult,
    type StructuredDbDialect,
} from "../../../gateways/db/reuse/db-command.js";

export interface MariaDbClient {
    query(
        sql: string,
        params?: unknown[],
    ): Promise<[unknown[], { affectedRows?: number }]>;
    beginTransaction(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}

const MARIADB_STRUCTURED_DB_DIALECT: StructuredDbDialect = {
    createPlaceholder() {
        return "?";
    },
    buildInsertPrefix(conflict) {
        if (conflict?.action === "ignore") {
            return "INSERT IGNORE INTO";
        }
        return "INSERT INTO";
    },
    buildInsertConflictClause({
        conflict,
        updateEntries,
        addParameter,
        hasExplicitUpdate,
    }) {
        if (conflict.action === "ignore") {
            return "";
        }
        const assignments = updateEntries.map(([column, value]) =>
            hasExplicitUpdate
                ? `${column} = ${addParameter(value)}`
                : `${column} = VALUES(${column})`,
        );
        return ` ON DUPLICATE KEY UPDATE ${assignments.join(", ")}`;
    },
};

export class MariaDbGateway implements DatabaseGateway {
    constructor(private readonly client: MariaDbClient) {}

    async executeCommand<Row = Record<string, unknown>>(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult<Row>> {
        const statement = buildStructuredDbCommandStatement(
            command,
            MARIADB_STRUCTURED_DB_DIALECT,
        );
        const [rows, meta] = await this.client.query(
            statement.sql,
            statement.params,
        );
        if (statement.returnsRows) {
            if (!Array.isArray(rows)) {
                throw new Error(
                    "MariaDB structured SELECT commands must return a row array.",
                );
            }
            const typedRows = rows as Row[];
            return { rows: typedRows, rowCount: typedRows.length };
        }
        return { rowCount: meta.affectedRows ?? 0 };
    }

    async query<Row = Record<string, unknown>>(
        statement: string,
        params?: unknown[],
    ): Promise<QueryResult<Row>> {
        const [rows] = await this.client.query(statement, params);
        const typedRows = rows as Row[];
        return { rows: typedRows, rowCount: typedRows.length };
    }

    async execute(
        statement: string,
        params?: unknown[],
    ): Promise<{ affectedRows: number }> {
        const [, meta] = await this.client.query(statement, params);
        return { affectedRows: meta.affectedRows ?? 0 };
    }

    async transaction<T>(
        callback: (db: DatabaseGateway) => Promise<T>,
    ): Promise<T> {
        await this.client.beginTransaction();
        try {
            const result = await callback(this);
            await this.client.commit();
            return result;
        } catch (error) {
            await this.client.rollback();
            throw error;
        }
    }
}
