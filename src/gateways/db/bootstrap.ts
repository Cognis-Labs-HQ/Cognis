import path from "node:path";
import { createDbExecutor, type SupportedDbType } from "./executor.js";
import { initializeDatabaseSchema } from "./init.js";
import type { GatewayBootstrapContext } from "../shared.js";
import type { DbExecutor } from "./reuse/db-executor.js";

/**
 * Dialect-aware SQL helper contributed as 'db:dialect'.
 *
 * Provides upsert and insert-ignore operations that resolve to the correct
 * SQL variant for the active database provider, eliminating per-dialect
 * branching from application code.
 */
export interface DbDialectHelper {
    upsert(
        table: string,
        keyCol: string,
        keyVal: unknown,
        extraData: Record<string, unknown>,
    ): Promise<void>;
    insertIgnore(table: string, data: Record<string, unknown>): Promise<void>;
}

function buildDialectHelper(
    executor: DbExecutor,
    dbType: SupportedDbType,
): DbDialectHelper {
    const ph = (i: number) => (dbType === "postgresql" ? `$${i}` : "?");

    return {
        async upsert(table, keyCol, keyVal, extraData) {
            const allKeys = [keyCol, ...Object.keys(extraData)];
            const allVals = [keyVal, ...Object.values(extraData)];
            const cols = allKeys.join(", ");
            const placeholders = allKeys.map((_, i) => ph(i + 1)).join(", ");
            const updateSet = Object.keys(extraData)
                .map((col, i) =>
                    dbType === "postgresql"
                        ? `${col} = EXCLUDED.${col}`
                        : `${col} = VALUES(${col})`,
                )
                .join(", ");

            if (dbType === "postgresql") {
                await executor.execute(
                    `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT (${keyCol}) DO UPDATE SET ${updateSet}`,
                    allVals,
                );
            } else {
                await executor.execute(
                    `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateSet}`,
                    allVals,
                );
            }
        },

        async insertIgnore(table, data) {
            const cols = Object.keys(data).join(", ");
            const placeholders = Object.keys(data)
                .map((_, i) => ph(i + 1))
                .join(", ");
            const vals = Object.values(data);

            if (dbType === "postgresql") {
                await executor.execute(
                    `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
                    vals,
                );
            } else {
                await executor.execute(
                    `INSERT IGNORE INTO ${table} (${cols}) VALUES (${placeholders})`,
                    vals,
                );
            }
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

    const dialect = buildDialectHelper(executor, dbType);
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
        version: "1.1.2",
        required: true,
        description:
            "Core relational database layer for persistent application data.",
        publisher: "Cognis Labs",
    });
}
