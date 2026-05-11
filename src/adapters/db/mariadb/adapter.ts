import type { DatabaseGateway, QueryResult } from "@cognis/core";
import type { BootstrapLog } from "@cognis/core";
import type { RawDbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type { DbProviderId } from "../../../gateways/db/reuse/provider-id.js";
import type { StructuredDbTableDef } from "../../../gateways/db/reuse/db-table.js";
import {
    buildDbErrorMeta,
    summarizeStatement,
    writeDbLog,
} from "../reuse/executor-log.js";
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

class MariaDbExecutor implements RawDbExecutor {
    private connectionPromise: Promise<MariaDbClient> | null = null;

    constructor(
        private readonly databaseUrl: string,
        private readonly log?: BootstrapLog,
    ) {}

    private async getClient(): Promise<MariaDbClient> {
        if (!this.connectionPromise) {
            this.connectionPromise = (async () => {
                const mariadb = await import("mysql2/promise");
                return (await mariadb.createConnection(
                    this.databaseUrl,
                )) as MariaDbClient;
            })();
        }
        return this.connectionPromise;
    }

    async execute(sql: string, params: unknown[] = []) {
        writeDbLog(this.log, "debug", "Executing SQL statement.", {
            component: "db",
            provider: "mariadb",
            statement: summarizeStatement(sql),
            parameterCount: params.length,
        });
        const client = await this.getClient();
        try {
            const [rows] = await client.query(sql, params);
            if (Array.isArray(rows)) {
                return { rows, rowCount: rows.length };
            }
            return {
                rowCount: (rows as { affectedRows?: number }).affectedRows ?? 0,
            };
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
        const gateway = new MariaDbGateway(await this.getClient());
        return gateway.executeCommand(command);
    }

    async transaction<T>(
        callback: (executor: RawDbExecutor) => Promise<T>,
    ): Promise<T> {
        const client = await this.getClient();
        await client.beginTransaction();
        try {
            const result = await callback(this);
            await client.commit();
            return result;
        } catch (error) {
            await client.rollback().catch(() => undefined);
            throw error;
        }
    }

    async ensureTable(def: StructuredDbTableDef): Promise<void> {
        const dbType = (col: StructuredDbTableDef['columns'][number]): string => {
            switch (col.type) {
                case 'text': return 'TEXT';
                case 'integer': return 'INT';
                case 'bigint': return 'BIGINT';
                case 'boolean': return 'TINYINT(1)';
                case 'timestamp': return 'DATETIME';
                case 'blob': return 'BLOB';
            }
        };
        const dbDefault = (value: StructuredDbTableDef['columns'][number]['default']): string => {
            if (value === 'now') return 'CURRENT_TIMESTAMP';
            if (value === 'true') return '1';
            if (value === 'false') return '0';
            if (value === null) return 'NULL';
            if (typeof value === 'number') return String(value);
            return `'${String(value).replace(/'/g, "''")}'`;
        };
        const compositePk = def.primaryKey ?? [];
        const columnDefs = def.columns.map((col) => {
            const parts: string[] = [`${col.name} ${dbType(col)}`];
            if (col.notNull || col.primaryKey) parts.push('NOT NULL');
            if (col.primaryKey && compositePk.length === 0) parts.push('PRIMARY KEY');
            if (col.unique && !(def.uniqueKeys ?? []).some((uk) => uk.length === 1 && uk[0] === col.name)) {
                parts.push('UNIQUE');
            }
            if (col.default !== undefined) parts.push(`DEFAULT ${dbDefault(col.default)}`);
            if (col.references) {
                parts.push(`REFERENCES ${col.references.table}(${col.references.column})`);
                if (col.references.onDelete) parts.push(`ON DELETE ${col.references.onDelete}`);
            }
            return parts.join(' ');
        });
        const tableConstraints: string[] = [];
        if (compositePk.length > 0) tableConstraints.push(`PRIMARY KEY (${compositePk.join(', ')})`);
        for (const uk of def.uniqueKeys ?? []) {
            tableConstraints.push(`UNIQUE (${uk.join(', ')})`);
        }
        const allDefs = [...columnDefs, ...tableConstraints];
        await this.execute(`CREATE TABLE IF NOT EXISTS ${def.name} (${allDefs.join(', ')})`);
        for (const index of def.indexes ?? []) {
            const indexName = index.name ?? `idx_${def.name}_${index.columns.join('_')}`;
            await this.execute(
                `CREATE INDEX IF NOT EXISTS ${indexName} ON ${def.name} (${index.columns.join(', ')})`,
            ).catch(() => undefined);
        }
    }
}

export function canHandleDbProvider(providerId: DbProviderId): boolean {
    return providerId === "mariadb";
}

export async function createDbExecutor(args: {
    databaseUrl: string;
    log?: BootstrapLog;
}): Promise<RawDbExecutor> {
    return new MariaDbExecutor(args.databaseUrl, args.log);
}
