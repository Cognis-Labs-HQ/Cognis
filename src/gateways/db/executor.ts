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
import type { DbExecutor } from "./reuse/db-executor.js";
import type { DbProviderId } from "./reuse/provider-id.js";

export type { DbExecutor } from "./reuse/db-executor.js";
export type { DbProviderId } from "./reuse/provider-id.js";
export type SupportedDbType = DbProviderId;

interface DbExecutorFactoryModule {
    canHandleDbProvider?: (providerId: DbProviderId) => boolean;
    createDbExecutor?: (args: {
        databaseUrl: string;
        log?: BootstrapLog;
    }) => Promise<DbExecutor> | DbExecutor;
}

async function listDbAdapterDirs(adaptersRoot: string): Promise<string[]> {
    try {
        const entries = await readdir(path.resolve(adaptersRoot, "db"), {
            withFileTypes: true,
        });
        return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    } catch {
        return [];
    }
}

async function loadDbExecutorFactoryModule(
    adaptersRoot: string,
    adapterId: string,
): Promise<DbExecutorFactoryModule | null> {
    const modulePath = path.resolve(adaptersRoot, "db", adapterId, "adapter.ts");
    try {
        return (await import(`${modulePath}?t=${Date.now()}`)) as DbExecutorFactoryModule;
    } catch {
        return null;
    }
}

export async function createDbExecutor(
    dbType: DbProviderId,
    log?: BootstrapLog,
    adaptersRoot?: string,
): Promise<DbExecutor> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error(`DATABASE_URL is required for DB_TYPE=${dbType}`);
    }

    const resolvedAdaptersRoot =
        adaptersRoot ?? path.resolve(process.cwd(), "src", "adapters");
    const adapterIds = await listDbAdapterDirs(resolvedAdaptersRoot);

    for (const adapterId of adapterIds) {
        const adapterModule = await loadDbExecutorFactoryModule(
            resolvedAdaptersRoot,
            adapterId,
        );
        if (
            !adapterModule?.createDbExecutor ||
            !adapterModule.canHandleDbProvider?.(dbType)
        ) {
            continue;
        }
        return adapterModule.createDbExecutor({
            databaseUrl,
            log,
        });
    }

    throw new Error(`db_executor_adapter_missing:${dbType}`);
}
