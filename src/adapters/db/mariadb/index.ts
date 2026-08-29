import type { DatabaseGateway, QueryResult } from "@cognis/core";
import type { BootstrapLog } from "@cognis/core";
import type { RawDbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type { DbProviderId } from "../../../gateways/db/reuse/provider-id.js";
import type { StructuredDbTableDef } from "../../../gateways/db/reuse/db-table.js";
import { readBoundedEnvironmentInteger } from "./settings.js";
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

export interface MariaDbClient {
    query(sql: string, params?: unknown[]): Promise<[unknown, unknown]>;
    beginTransaction(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    release(): void;
}

export interface MariaDbPool {
    query(sql: string, params?: unknown[]): Promise<[unknown, unknown]>;
    getConnection(): Promise<MariaDbClient>;
    end(): Promise<void>;
    on?(event: "error", handler: (error: Error) => void): void;
}

export interface MariaDbPoolSettings {
    waitForConnections: true;
    connectionLimit: number;
    maxIdle: number;
    idleTimeout: number;
    connectTimeout: number;
    queueLimit: number;
}

export interface MariaDbStartupSettings {
    timeout: number;
    retryInterval: number;
}

export function readMariaDbStartupSettings(): MariaDbStartupSettings {
    return {
        timeout: readBoundedEnvironmentInteger(
            "MARIADB_STARTUP_TIMEOUT_MS",
            60_000,
            1_000,
            600_000,
        ),
        retryInterval: readBoundedEnvironmentInteger(
            "MARIADB_STARTUP_RETRY_INTERVAL_MS",
            1_000,
            100,
            30_000,
        ),
    };
}

export function readMariaDbPoolSettings(): MariaDbPoolSettings {
    const connectionLimit = readBoundedEnvironmentInteger(
        "MARIADB_POOL_MAX",
        10,
        1,
        100,
    );
    return {
        waitForConnections: true,
        connectionLimit,
        maxIdle: connectionLimit,
        idleTimeout: readBoundedEnvironmentInteger(
            "MARIADB_POOL_IDLE_TIMEOUT_MS",
            30_000,
            1_000,
            600_000,
        ),
        connectTimeout: readBoundedEnvironmentInteger(
            "MARIADB_POOL_CONNECTION_TIMEOUT_MS",
            5_000,
            100,
            120_000,
        ),
        queueLimit: readBoundedEnvironmentInteger(
            "MARIADB_POOL_QUEUE_LIMIT",
            100,
            1,
            10_000,
        ),
    };
}

function readAffectedRows(result: unknown): number {
    if (
        typeof result === "object" &&
        result !== null &&
        "affectedRows" in result &&
        typeof result.affectedRows === "number"
    ) {
        return result.affectedRows;
    }
    return 0;
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
    private readonly pool?: MariaDbPool;

    constructor(
        private readonly queryTarget: Pick<MariaDbPool, "query">,
        private readonly log?: BootstrapLog,
    ) {
        if ("getConnection" in queryTarget) {
            this.pool = queryTarget as MariaDbPool;
        }
    }

    async executeCommand<Row = Record<string, unknown>>(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult<Row>> {
        const statement = buildStructuredDbCommandStatement(
            command,
            MARIADB_STRUCTURED_DB_DIALECT,
        );
        const [result] = await this.queryTarget.query(
            statement.sql,
            statement.params,
        );
        if (statement.returnsRows) {
            if (!Array.isArray(result)) {
                throw new Error(
                    "MariaDB structured SELECT commands must return a row array.",
                );
            }
            const rows = result as Row[];
            return { rows, rowCount: rows.length };
        }
        return { rowCount: readAffectedRows(result) };
    }

    async query<Row = Record<string, unknown>>(
        statement: string,
        params?: unknown[],
    ): Promise<QueryResult<Row>> {
        const [result] = await this.queryTarget.query(statement, params);
        const rows = result as Row[];
        return { rows, rowCount: rows.length };
    }

    async execute(
        statement: string,
        params?: unknown[],
    ): Promise<{ affectedRows: number }> {
        const [result] = await this.queryTarget.query(statement, params);
        return { affectedRows: readAffectedRows(result) };
    }

    async transaction<T>(
        callback: (db: DatabaseGateway) => Promise<T>,
    ): Promise<T> {
        if (!this.pool) {
            throw new Error("MariaDB transactions require a connection pool.");
        }
        const client = await this.pool.getConnection();
        const transactionGateway = new MariaDbGateway(client, this.log);
        try {
            await client.beginTransaction();
            const result = await callback(transactionGateway);
            await client.commit();
            return result;
        } catch (error) {
            writeDbLog(this.log, "error", "MariaDB transaction failed.", {
                component: "db",
                provider: "mariadb",
                ...buildDbErrorMeta(error),
            });
            try {
                await client.rollback();
            } catch (rollbackError) {
                writeDbLog(this.log, "error", "MariaDB rollback failed.", {
                    component: "db",
                    provider: "mariadb",
                    ...buildDbErrorMeta(rollbackError),
                });
            }
            throw error;
        } finally {
            client.release();
        }
    }
}

class MariaDbExecutor implements RawDbExecutor {
    constructor(
        private readonly pool: MariaDbPool,
        private readonly log?: BootstrapLog,
        private readonly columnTypes = new Map<
            string,
            Map<string, StructuredDbTableDef["columns"][number]["type"]>
        >(),
    ) {}

    async execute(sql: string, params: unknown[] = []) {
        writeDbLog(this.log, "debug", "Executing SQL statement.", {
            component: "db",
            provider: "mariadb",
            statement: summarizeStatement(sql),
            parameterCount: params.length,
        });
        try {
            const [result] = await this.pool.query(sql, params);
            if (Array.isArray(result)) {
                return { rows: result, rowCount: result.length };
            }
            return { rowCount: readAffectedRows(result) };
        } catch (error) {
            writeDbLog(this.log, "warn", "SQL execution failed.", {
                component: "db",
                provider: "mariadb",
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
        const gateway = new MariaDbGateway(this.pool, this.log);
        const normalizedCommand = this.normalizeTemporalValues(command);
        try {
            return await gateway.executeCommand(normalizedCommand);
        } catch (error) {
            if (readErrorCode(error) !== "ER_TRUNCATED_WRONG_VALUE") {
                throw error;
            }
            const fallbackCommand = this.normalizeTemporalValues(command, true);
            if (
                JSON.stringify(fallbackCommand) ===
                JSON.stringify(normalizedCommand)
            ) {
                throw error;
            }
            writeDbLog(
                this.log,
                "warn",
                "Retrying MariaDB command with normalized temporal values.",
                {
                    component: "db",
                    provider: "mariadb",
                    table: command.table,
                },
            );
            return gateway.executeCommand(fallbackCommand);
        }
    }

    async transaction<T>(
        callback: (executor: RawDbExecutor) => Promise<T>,
    ): Promise<T> {
        const client = await this.pool.getConnection();
        const transactionExecutor = new MariaDbExecutor(
            {
                query: client.query.bind(client),
                getConnection: async () => client,
                end: async () => undefined,
            },
            this.log,
            this.columnTypes,
        );
        try {
            await client.beginTransaction();
            const result = await callback(transactionExecutor);
            await client.commit();
            return result;
        } catch (error) {
            writeDbLog(this.log, "error", "MariaDB transaction failed.", {
                component: "db",
                provider: "mariadb",
                ...buildDbErrorMeta(error),
            });
            try {
                await client.rollback();
            } catch (rollbackError) {
                writeDbLog(this.log, "error", "MariaDB rollback failed.", {
                    component: "db",
                    provider: "mariadb",
                    ...buildDbErrorMeta(rollbackError),
                });
            }
            throw error;
        } finally {
            client.release();
        }
    }

    async ensureTable(def: StructuredDbTableDef): Promise<void> {
        this.columnTypes.set(
            def.name,
            new Map(def.columns.map((column) => [column.name, column.type])),
        );
        const compositePk = def.primaryKey ?? [];
        const keyColumns = new Set<string>([
            ...compositePk,
            ...(def.uniqueKeys ?? []).flat(),
            ...(def.indexes ?? []).flatMap((index) => index.columns),
        ]);
        const isKeyColumn = (
            col: StructuredDbTableDef["columns"][number],
        ): boolean =>
            Boolean(col.primaryKey) ||
            Boolean(col.unique) ||
            col.references !== undefined ||
            keyColumns.has(col.name);
        const dbType = (
            col: StructuredDbTableDef["columns"][number],
        ): string => {
            switch (col.type) {
                case "text":
                    return isKeyColumn(col) ? "VARCHAR(255)" : "TEXT";
                case "integer":
                    return "INT";
                case "bigint":
                    return "BIGINT";
                case "boolean":
                    return "TINYINT(1)";
                case "timestamp":
                    return "DATETIME";
                case "blob":
                    return "BLOB";
            }
        };
        const dbDefault = (
            value: StructuredDbTableDef["columns"][number]["default"],
        ): string => {
            if (value === "now") return "CURRENT_TIMESTAMP";
            if (value === "true") return "1";
            if (value === "false") return "0";
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
                    return "0";
                case "timestamp":
                    return "CURRENT_TIMESTAMP";
                default:
                    return "''";
            }
        };
        const columnDefs = def.columns.map((col) => {
            const parts: string[] = [`${col.name} ${dbType(col)}`];
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
                parts.push(`DEFAULT ${dbDefault(col.default)}`);
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
        const existingColsResult = await this.execute(
            `SELECT column_name, data_type FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
            [def.name],
        );
        const existingCols = new Set(
            (existingColsResult.rows ?? []).map((row) =>
                String((row as Record<string, unknown>).column_name ?? ""),
            ),
        );
        const existingColumnTypes = new Map(
            (existingColsResult.rows ?? []).map((row) => {
                const column = row as Record<string, unknown>;
                return [
                    String(column.column_name ?? ""),
                    String(column.data_type ?? "").toLowerCase(),
                ];
            }),
        );
        for (const col of def.columns) {
            if (existingCols.has(col.name)) continue;
            const defaultClause =
                col.default !== undefined
                    ? `DEFAULT ${dbDefault(col.default)}`
                    : col.notNull
                      ? `DEFAULT ${notNullFallback(col)}`
                      : "";
            const notNullClause = col.notNull ? " NOT NULL" : "";
            const referenceClause = col.references
                ? ` REFERENCES ${col.references.table}(${col.references.column})${col.references.onDelete ? ` ON DELETE ${col.references.onDelete}` : ""}`
                : "";
            await this.execute(
                `ALTER TABLE ${def.name} ADD COLUMN IF NOT EXISTS ${col.name} ${dbType(col)}${notNullClause}${defaultClause ? ` ${defaultClause}` : ""}${referenceClause}`,
            );
        }
        for (const col of def.columns) {
            if (
                col.type !== "text" ||
                !isKeyColumn(col) ||
                existingColumnTypes.get(col.name) !== "text"
            ) {
                continue;
            }
            const notNullClause =
                col.notNull || col.primaryKey ? " NOT NULL" : "";
            const defaultClause =
                col.default !== undefined
                    ? ` DEFAULT ${dbDefault(col.default)}`
                    : "";
            await this.execute(
                `ALTER TABLE ${def.name} MODIFY COLUMN ${col.name} ${dbType(col)}${notNullClause}${defaultClause}`,
            );
        }
        for (const index of def.indexes ?? []) {
            const indexName =
                index.name ?? `idx_${def.name}_${index.columns.join("_")}`;
            await this.execute(
                `CREATE INDEX IF NOT EXISTS ${indexName} ON ${def.name} (${index.columns.join(", ")})`,
            );
        }
    }

    private normalizeTemporalValues(
        command: StructuredDbCommand,
        includeUndeclaredColumns = false,
    ): StructuredDbCommand {
        const tableColumns = this.columnTypes.get(command.table);
        if (!tableColumns && !includeUndeclaredColumns) return command;
        const normalize = (column: string, value: unknown): unknown => {
            if (
                (!includeUndeclaredColumns &&
                    tableColumns?.get(column) !== "timestamp") ||
                typeof value !== "string" ||
                !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(
                    value,
                )
            ) {
                return value;
            }
            return value.slice(0, 19).replace("T", " ");
        };
        const normalizeRecord = (record: Record<string, unknown>) =>
            Object.fromEntries(
                Object.entries(record).map(([column, value]) => [
                    column,
                    normalize(column, value),
                ]),
            );
        const where = command.where?.map((clause) => ({
            ...clause,
            value: Array.isArray(clause.value)
                ? clause.value.map((value) => normalize(clause.column, value))
                : normalize(clause.column, clause.value),
        }));
        if (command.option === "INSERT") {
            return {
                ...command,
                values: normalizeRecord(command.values),
                conflict:
                    command.conflict?.action === "update" &&
                    command.conflict.update
                        ? {
                              ...command.conflict,
                              update: normalizeRecord(command.conflict.update),
                          }
                        : command.conflict,
            };
        }
        if (command.option === "UPDATE") {
            return { ...command, set: normalizeRecord(command.set), where };
        }
        return { ...command, where };
    }
}

export function canHandleDbProvider(providerId: DbProviderId): boolean {
    return providerId === "mariadb";
}

export async function createDbExecutor(args: {
    databaseUrl: string;
    log?: BootstrapLog;
    lifecycle?: { registerShutdown(handler: () => Promise<void>): void };
    pool?: MariaDbPool;
    startup?: MariaDbStartupSettings;
    sleep?: (milliseconds: number) => Promise<void>;
}): Promise<RawDbExecutor> {
    const pool =
        args.pool ?? (await createMariaDbPool(args.databaseUrl, args.log));
    try {
        await waitForMariaDb(
            pool,
            args.startup ?? readMariaDbStartupSettings(),
            args.log,
            args.sleep,
        );
    } catch (error) {
        await pool.end();
        throw error;
    }
    args.lifecycle?.registerShutdown(async () => {
        await pool.end();
        writeDbLog(args.log, "info", "MariaDB connection pool drained.", {
            component: "db",
            provider: "mariadb",
        });
    });
    return new MariaDbExecutor(pool, args.log);
}

const RETRYABLE_STARTUP_ERROR_CODES = new Set([
    "ECONNREFUSED",
    "ECONNRESET",
    "EHOSTUNREACH",
    "ENETUNREACH",
    "ETIMEDOUT",
    "PROTOCOL_CONNECTION_LOST",
]);

function readErrorCode(error: unknown): string | undefined {
    if (typeof error !== "object" || error === null || !("code" in error)) {
        return undefined;
    }
    return typeof error.code === "string" ? error.code : undefined;
}

export async function waitForMariaDb(
    pool: Pick<MariaDbPool, "query">,
    settings: MariaDbStartupSettings,
    log?: BootstrapLog,
    sleep: (milliseconds: number) => Promise<void> = (milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds)),
): Promise<void> {
    const deadline = Date.now() + settings.timeout;
    let attempt = 0;
    while (true) {
        attempt += 1;
        try {
            await pool.query("SELECT 1");
            if (attempt > 1) {
                writeDbLog(log, "info", "MariaDB became ready.", {
                    component: "db",
                    provider: "mariadb",
                    attempts: attempt,
                });
            }
            return;
        } catch (error) {
            const code = readErrorCode(error);
            const retryable =
                code !== undefined && RETRYABLE_STARTUP_ERROR_CODES.has(code);
            if (!retryable || Date.now() >= deadline) {
                throw error;
            }
            writeDbLog(log, "warn", "MariaDB is not ready; retrying.", {
                component: "db",
                provider: "mariadb",
                attempt,
                retryIntervalMs: settings.retryInterval,
                ...buildDbErrorMeta(error),
            });
            await sleep(settings.retryInterval);
        }
    }
}

async function createMariaDbPool(
    databaseUrl: string,
    log?: BootstrapLog,
): Promise<MariaDbPool> {
    const mariadb = await import("mysql2/promise");
    const pool = mariadb.createPool({
        uri: databaseUrl,
        ...readMariaDbPoolSettings(),
    });
    pool.on("error", (error: Error) => {
        writeDbLog(log, "error", "Idle MariaDB pool connection failed.", {
            component: "db",
            provider: "mariadb",
            ...buildDbErrorMeta(error),
        });
    });
    return pool as MariaDbPool;
}
