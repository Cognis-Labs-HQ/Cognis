import path from "node:path";
import { createDbExecutor, type SupportedDbType } from "./executor.js";
import { initializeDatabaseSchema } from "./init.js";
import type { GatewayBootstrapContext } from "../shared.js";
import type { DbExecutor } from "./reuse/db-executor.js";
import {
    buildStructuredDbCommandStatement,
    type StructuredDbCommand,
    type StructuredDbCommandResult,
} from "./reuse/db-command.js";

/**
 * Dialect-aware SQL helper contributed as 'db:dialect'.
 *
 * Provides upsert and insert-ignore operations that resolve to the correct
 * SQL variant for the active database provider, eliminating per-dialect
 * branching from application code.
 */
export interface DbDialectHelper {
    executeCommand(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult>;
    upsert(
        table: string,
        keyCol: string,
        keyVal: unknown,
        extraData: Record<string, unknown>,
    ): Promise<void>;
    insertIgnore(table: string, data: Record<string, unknown>): Promise<void>;
}

export function createDbDialectHelper(
    executor: DbExecutor,
    dbType: SupportedDbType,
): DbDialectHelper {
    return {
        async executeCommand(command) {
            const statement = buildStructuredDbCommandStatement(
                command,
                dbType,
            );
            return executor.execute(statement.sql, statement.params);
        },
        async upsert(table, keyCol, keyVal, extraData) {
            await this.executeCommand({
                option: "INSERT",
                table,
                values: {
                    [keyCol]: keyVal,
                    ...extraData,
                },
                conflict: {
                    action: "update",
                    target: [keyCol],
                },
            });
        },

        async insertIgnore(table, data) {
            await this.executeCommand({
                option: "INSERT",
                table,
                values: data,
                conflict: {
                    action: "ignore",
                },
            });
        },
    };
}

export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const dbType =
        (process.env.DB_TYPE as SupportedDbType | undefined) ?? "postgresql";
    const adaptersRoot =
        ctx.adaptersRoot ?? path.resolve(process.cwd(), "src", "adapters");

    const executor = await createDbExecutor(dbType, ctx.log);
    const logger = {
        info: (msg: string, meta?: Record<string, unknown>) => {
            void ctx.log?.("info", msg, meta);
        },
    };

    await initializeDatabaseSchema(dbType, logger, executor, adaptersRoot);

    const dialect = createDbDialectHelper(executor, dbType);
    await dialect.insertIgnore("modules", {
        module_id: "cognis-core",
        enabled: true,
    });

    ctx.capabilities.contribute("db:executor", executor);
    ctx.capabilities.contribute("db:type", dbType);
    ctx.capabilities.contribute("db:dialect", dialect);

    ctx.dbExecutor = executor;
    ctx.dbType = dbType;

    ctx.gatewayRegistry.register({
        id: "db",
        name: "Database Gateway",
        version: "1.2.0",
        required: true,
        description:
            "Core relational database layer for persistent application data.",
        publisher: "Cognis Labs",
    });
}
