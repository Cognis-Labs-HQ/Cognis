import type { DatabaseGateway, QueryResult } from "@cognis/core";
import type { BootstrapLog } from "@cognis/core";
import type { RawDbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type { DbProviderId } from "../../../gateways/db/reuse/provider-id.js";
import type { StructuredDbTableDef } from "../../../gateways/db/reuse/db-table.js";
import {
    buildDbErrorMeta,
    summarizeStatement,
    writeDbLog,
} from "../../../gateways/db/reuse/executor-log.js";
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

class PostgresExecutor implements RawDbExecutor {
    private clientPromise: Promise<PostgresClient> | null = null;

    constructor(
        private readonly databaseUrl: string,
        private readonly log?: BootstrapLog,
    ) {}

    private async getClient(): Promise<PostgresClient> {
        if (!this.clientPromise) {
            this.clientPromise = (async () => {
                const { Client } = await import("pg");
                const client = new Client({
                    connectionString: this.databaseUrl,
                });
                client.on("error", (error: Error) => {
                    writeDbLog(
                        this.log,
                        "warn",
                        "Database client emitted error event.",
                        {
                            component: "db",
                            provider: "postgresql",
                            ...buildDbErrorMeta(error),
                        },
                    );
                });
                await client.connect();
                return client as PostgresClient;
            })();
        }
        return this.clientPromise;
    }

    async execute(sql: string, params: unknown[] = []) {
        let paramIndex = 1;
        const normalizedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
        writeDbLog(this.log, "debug", "Executing SQL statement.", {
            component: "db",
            provider: "postgresql",
            statement: summarizeStatement(normalizedSql),
            parameterCount: params.length,
        });
        const client = await this.getClient();
        try {
            const result = await client.query(normalizedSql, params);
            return { rows: result.rows, rowCount: result.rowCount };
        } catch (error) {
            writeDbLog(this.log, "warn", "SQL execution failed.", {
                component: "db",
                provider: "postgresql",
                statement: summarizeStatement(normalizedSql),
                parameterCount: params.length,
                ...buildDbErrorMeta(error),
            });
            throw error;
        }
    }

    async executeCommand(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult> {
        const gateway = new PostgresDbGateway(await this.getClient());
        return gateway.executeCommand(command);
    }

    async transaction<T>(
        callback: (executor: RawDbExecutor) => Promise<T>,
    ): Promise<T> {
        await this.execute("BEGIN");
        try {
            const result = await callback(this);
            await this.execute("COMMIT");
            return result;
        } catch (error) {
            await this.execute("ROLLBACK").catch(() => undefined);
            throw error;
        }
    }

    async ensureTable(def: StructuredDbTableDef): Promise<void> {
        const pgType = (
            col: StructuredDbTableDef["columns"][number],
        ): string => {
            switch (col.type) {
                case "text":
                    return "TEXT";
                case "integer":
                    return "INTEGER";
                case "bigint":
                    return "BIGINT";
                case "boolean":
                    return "BOOLEAN";
                case "timestamp":
                    return "TIMESTAMP";
                case "blob":
                    return "BYTEA";
            }
        };
        const pgDefault = (
            value: StructuredDbTableDef["columns"][number]["default"],
        ): string => {
            if (value === "now") return "CURRENT_TIMESTAMP";
            if (value === "true") return "TRUE";
            if (value === "false") return "FALSE";
            if (value === null) return "NULL";
            if (typeof value === "number") return String(value);
            return `'${String(value).replace(/'/g, "''")}'`;
        };
        const notNullFallback = (
            col: StructuredDbTableDef["columns"][number],
        ): string => {
            switch (col.type) {
                case "integer":
                case "bigint":
                    return "0";
                case "boolean":
                    return "FALSE";
                case "timestamp":
                    return "CURRENT_TIMESTAMP";
                default:
                    return "''";
            }
        };
        const compositePk = def.primaryKey ?? [];
        const columnDefs = def.columns.map((col) => {
            const parts: string[] = [`${col.name} ${pgType(col)}`];
            if (col.notNull || col.primaryKey) parts.push("NOT NULL");
            if (col.primaryKey && compositePk.length === 0)
                parts.push("PRIMARY KEY");
            if (
                col.unique &&
                !(def.uniqueKeys ?? []).some(
                    (uk) => uk.length === 1 && uk[0] === col.name,
                )
            ) {
                parts.push("UNIQUE");
            }
            if (col.default !== undefined)
                parts.push(`DEFAULT ${pgDefault(col.default)}`);
            if (col.references) {
                parts.push(
                    `REFERENCES ${col.references.table}(${col.references.column})`,
                );
                if (col.references.onDelete)
                    parts.push(`ON DELETE ${col.references.onDelete}`);
            }
            return parts.join(" ");
        });
        const tableConstraints: string[] = [];
        if (compositePk.length > 0)
            tableConstraints.push(`PRIMARY KEY (${compositePk.join(", ")})`);
        for (const uniqueKey of def.uniqueKeys ?? []) {
            tableConstraints.push(`UNIQUE (${uniqueKey.join(", ")})`);
        }
        const allDefs = [...columnDefs, ...tableConstraints];
        await this.execute(
            `CREATE TABLE IF NOT EXISTS ${def.name} (${allDefs.join(", ")})`,
        );
        for (const index of def.indexes ?? []) {
            const indexName =
                index.name ?? `idx_${def.name}_${index.columns.join("_")}`;
            await this.execute(
                `CREATE INDEX IF NOT EXISTS ${indexName} ON ${def.name} (${index.columns.join(", ")})`,
            ).catch(() => undefined);
        }
        const existingColsResult = await this.execute(
            `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = current_schema()`,
            [def.name],
        );
        const existingCols = new Set(
            (existingColsResult.rows ?? []).map((row) =>
                String((row as Record<string, unknown>).column_name ?? ""),
            ),
        );
        for (const col of def.columns) {
            if (existingCols.has(col.name)) continue;
            const defaultClause =
                col.default !== undefined
                    ? `DEFAULT ${pgDefault(col.default)}`
                    : col.notNull
                      ? `DEFAULT ${notNullFallback(col)}`
                      : "";
            const notNullClause = col.notNull ? " NOT NULL" : "";
            await this.execute(
                `ALTER TABLE ${def.name} ADD COLUMN IF NOT EXISTS ${col.name} ${pgType(col)}${notNullClause}${defaultClause ? ` ${defaultClause}` : ""}`,
            ).catch(() => undefined);
        }
    }
}

export function canHandleDbProvider(providerId: DbProviderId): boolean {
    return providerId === "postgresql";
}

export async function createDbExecutor(args: {
    databaseUrl: string;
    log?: BootstrapLog;
}): Promise<RawDbExecutor> {
    return new PostgresExecutor(args.databaseUrl, args.log);
}
