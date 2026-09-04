import { readGatewayManifestVersion } from "../reuse/manifest-version.js";
import path from "node:path";
import { createDbExecutor } from "./executor.js";
import { initializeDatabaseSchema, resolveDbProviderDir } from "./init.js";
import type { GatewayBootstrapContext } from "../shared.js";
import type { DbExecutor, RawDbExecutor } from "./reuse/db-executor.js";
import type {
    StructuredDbCommand,
    StructuredDbCommandResult,
} from "./reuse/db-command.js";
import type { DbProviderId } from "./reuse/provider-id.js";
import type { RouteContext } from "../../api/reuse/route-context.js";
import {
    createLockedAdapterAdminRoutes,
    loadAdapterAdminCatalog,
} from "../reuse/adapter-admin-catalog.js";

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

export function createDbDialectHelper(executor: DbExecutor): DbDialectHelper {
    return {
        async executeCommand(command) {
            return executor.executeCommand(command);
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
    const manifestVersion = await readGatewayManifestVersion(
        import.meta.url,
        "./manifest.json",
    );
    const dbType =
        (process.env.DB_TYPE as DbProviderId | undefined) ?? "postgresql";
    const adaptersRoot =
        ctx.adaptersRoot ?? path.resolve(process.cwd(), "src", "adapters");

    const lifecycle = ctx.capabilities.get<{
        registerShutdown(handler: () => Promise<void>): void;
    }>("system:lifecycle");
    const providerExecutor = await createDbExecutor(
        dbType,
        ctx.log,
        adaptersRoot,
        lifecycle,
    );
    const timed = async <Result>(operation: () => Promise<Result>) => {
        const startedAt = performance.now();
        try {
            return await operation();
        } finally {
            ctx.capabilities
                .get<{
                    record(name: string, value: number): void;
                }>("observability:metrics")
                ?.record("db.duration_ms", performance.now() - startedAt);
        }
    };
    const createTimedExecutor = (
        rawExecutor: RawDbExecutor,
    ): RawDbExecutor => ({
        execute: (sql, params) => timed(() => rawExecutor.execute(sql, params)),
        executeCommand: (command) =>
            timed(() => rawExecutor.executeCommand(command)),
        ensureTable: (definition) =>
            timed(() => rawExecutor.ensureTable(definition)),
        transaction: (callback) =>
            timed(() =>
                rawExecutor.transaction(async (transactionExecutor) =>
                    callback(createTimedExecutor(transactionExecutor)),
                ),
            ),
    });
    const executor = createTimedExecutor(providerExecutor);
    const logger = {
        info: (msg: string, meta?: Record<string, unknown>) => {
            void ctx.log?.("info", msg, meta);
        },
    };

    await initializeDatabaseSchema(dbType, logger, executor, adaptersRoot);

    const dialect = createDbDialectHelper(executor);
    await dialect.insertIgnore("modules", {
        module_id: "cognis-core",
        enabled: true,
    });

    ctx.capabilities.contribute("db:executor", executor);
    ctx.capabilities.contribute("db:type", dbType);
    ctx.capabilities.contribute("db:dialect", dialect);

    const adapterCatalog = await loadAdapterAdminCatalog(adaptersRoot, "db");
    const routeContext =
        ctx.capabilities.get<RouteContext>("auth:routeContext");
    ctx.routeRegistry.register(
        createLockedAdapterAdminRoutes(
            "db",
            adapterCatalog,
            routeContext,
            resolveDbProviderDir(dbType),
        ),
        "db",
    );

    ctx.gatewayRegistry.register({
        id: "db",
        name: "Database Gateway",
        version: manifestVersion,
        required: true,
        description:
            "Core relational database layer for persistent application data.",
        publisher: "Cognis Labs HQ",
        hasAdapters: true,
    });
}
