import {
    bootstrapAdapter,
    type AdapterContractModule,
} from "../reuse/adapter-bootstrap.js";
import type { GatewayBootstrapContext } from "../shared.js";
/**
 * Generic DB executor loader for the DB gateway.
 *
 * The gateway does not own concrete provider implementations. Instead it scans
 * DB adapter modules at runtime, imports their generic factory functions, and
 * forwards executor creation to the adapter that declares it can handle the
 * requested provider id.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";
import type { BootstrapLog } from "@cognis/core";
import type { RawDatabaseExecutor } from "./reuse/db-executor.js";
import type { DatabaseProviderId } from "./reuse/provider-id.js";

export type {
    DatabaseExecutor,
    RawDatabaseExecutor,
} from "./reuse/db-executor.js";
export type { DatabaseProviderId } from "./reuse/provider-id.js";
export type SupportedDatabaseType = DatabaseProviderId;

interface DatabaseExecutorFactoryModule extends AdapterContractModule {
    canHandleDatabaseProvider?: (providerId: DatabaseProviderId) => boolean;
    createDatabaseExecutor?: (args: {
        databaseUrl: string;
        log?: BootstrapLog;
        lifecycle?: {
            registerShutdown(handler: () => Promise<void>): void;
        };
    }) => Promise<RawDatabaseExecutor> | RawDatabaseExecutor;
}

async function listDatabaseAdapterDirectories(
    adaptersRoot: string,
): Promise<string[]> {
    try {
        const entries = await readdir(path.resolve(adaptersRoot, "db"), {
            withFileTypes: true,
        });
        return entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);
    } catch {
        return [];
    }
}

async function loadDatabaseExecutorFactoryModule(
    adaptersRoot: string,
    adapterId: string,
): Promise<DatabaseExecutorFactoryModule | null> {
    const modulePath = path.resolve(adaptersRoot, "db", adapterId, "index.ts");
    try {
        return (await import(modulePath)) as DatabaseExecutorFactoryModule;
    } catch {
        return null;
    }
}

async function createDatabaseExecutor(
    databaseType: DatabaseProviderId,
    log?: BootstrapLog,
    adaptersRoot?: string,
    lifecycle?: { registerShutdown(handler: () => Promise<void>): void },
    context?: GatewayBootstrapContext,
): Promise<RawDatabaseExecutor> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error(`DATABASE_URL is required for DB_TYPE=${databaseType}`);
    }

    const resolvedAdaptersRoot =
        adaptersRoot ?? path.resolve(process.cwd(), "src", "adapters");
    const adapterIds =
        await listDatabaseAdapterDirectories(resolvedAdaptersRoot);

    for (const adapterId of adapterIds) {
        const adapterModule = await loadDatabaseExecutorFactoryModule(
            resolvedAdaptersRoot,
            adapterId,
        );
        if (
            !adapterModule?.createDatabaseExecutor ||
            !adapterModule.canHandleDatabaseProvider?.(databaseType)
        ) {
            continue;
        }
        const create = () =>
            adapterModule.createDatabaseExecutor!({
                databaseUrl,
                log,
                lifecycle,
            });
        if (adapterModule.defineContracts !== undefined) {
            if (!context) throw new Error("adapter_contract_context_required");
            return bootstrapAdapter(
                "db",
                adapterId,
                context,
                adapterModule,
                create,
            );
        }
        return create();
    }

    throw new Error(`db_executor_adapter_missing:${databaseType}`);
}
export { createDatabaseExecutor };
