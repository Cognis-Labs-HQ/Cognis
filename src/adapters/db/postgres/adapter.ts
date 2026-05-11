import type { DatabaseGateway, QueryResult } from "@cognis/core";
import type { BootstrapLog } from "@cognis/core";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type { DbProviderId } from "../../../gateways/db/reuse/provider-id.js";
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

function summarizeStatement(sql: string): string {
    const statement = sql.trim().split(/\s+/, 1)[0];
    return statement ? statement.toUpperCase() : "UNKNOWN";
}

function getErrorCode(error: unknown): string | undefined {
    const code = (error as { code?: unknown })?.code;
    if (typeof code === "string" || typeof code === "number") {
        return String(code);
    }
    return undefined;
}

function buildDbErrorMeta(error: unknown): Record<string, unknown> {
    const meta: Record<string, unknown> = {
        errorName: error instanceof Error ? error.name : typeof error,
    };
    const errorCode = getErrorCode(error);
    if (errorCode) {
        meta.errorCode = errorCode;
    }
    return meta;
}

function writeDbLog(
    log: BootstrapLog | undefined,
    level: "debug" | "info" | "warn" | "error",
    message: string,
    meta?: Record<string, unknown>,
): void {
    log?.(level, message, meta);
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

class PostgresExecutor implements DbExecutor {
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
        writeDbLog(this.log, "debug", "Executing SQL statement.", {
            component: "db",
            provider: "postgresql",
            statement: summarizeStatement(sql),
            parameterCount: params.length,
        });
        const client = await this.getClient();
        try {
            const result = await client.query(sql, params);
            return { rows: result.rows, rowCount: result.rowCount };
        } catch (error) {
            writeDbLog(this.log, "warn", "SQL execution failed.", {
                component: "db",
                provider: "postgresql",
                statement: summarizeStatement(sql),
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
}

export function canHandleDbProvider(providerId: DbProviderId): boolean {
    return providerId === "postgresql";
}

export async function createDbExecutor(args: {
    databaseUrl: string;
    log?: BootstrapLog;
}): Promise<DbExecutor> {
    return new PostgresExecutor(args.databaseUrl, args.log);
}
