import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { CapabilityStore, GatewayRegistry } from "@cognis/core";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { SupportedDbType } from "../db/executor.js";

/**
 * Implemented by each study adapter and registered during discovery so the
 * gateway can list, configure, enable, and disable adapters before their
 * runtime routes bootstrap.
 */
export interface StudyAdapter {
    readonly adapterId: string;
    readonly adapterName: string;
    readonly requires?: string[];
    getConfig?(): Record<string, unknown>;
    setConfig?(config: Record<string, unknown>): void;
    isConfigured?(): boolean;
}

export interface StudyAdapterInfo {
    id: string;
    name: string;
    active: boolean;
    requires?: string[];
}

/**
 * Context passed to `bootstrapStudyAdapter` when a study adapter exports that
 * function. Mirrors the social gateway adapter bootstrap contract.
 */
export interface StudyAdapterBootstrapCtx {
    gateway: CoreStudyGateway;
    adapterId: string;
    adapterRoot: string;
    capabilities: CapabilityStore;
    gatewayRegistry: GatewayRegistry;
    registerRoute(
        handler: (
            req: IncomingMessage,
            res: ServerResponse,
            url: URL,
        ) => Promise<boolean>,
        gatewayId?: string,
    ): void;
    registerStaticDir(urlPrefix: string, absoluteDir: string): void;
    registerNavbarPlugin(scriptUrl: string, isEnabled?: () => boolean): void;
    isAdapterEnabled(adapterId?: string): boolean;
    log?(
        level: string,
        message: string,
        meta?: Record<string, unknown>,
    ): void | Promise<void>;
    dbExecutor?: DbExecutor;
    dbType?: SupportedDbType;
}

type StudyBootstrapBaseCtx = Omit<
    StudyAdapterBootstrapCtx,
    "adapterId" | "adapterRoot" | "isAdapterEnabled"
>;

export class CoreStudyGateway {
    private readonly registeredAdapters = new Map<string, StudyAdapter>();
    private readonly disabledAdapters = new Set<string>();

    registerAdapter(adapter: StudyAdapter): void {
        this.registeredAdapters.set(adapter.adapterId, adapter);
    }

    listAdapters(): StudyAdapterInfo[] {
        return Array.from(this.registeredAdapters.values()).map((adapter) => ({
            id: adapter.adapterId,
            name: adapter.adapterName,
            active:
                !this.disabledAdapters.has(adapter.adapterId) &&
                (typeof adapter.isConfigured === "function"
                    ? adapter.isConfigured()
                    : true),
        }));
    }

    isAdapterEnabled(adapterId: string): boolean {
        const adapter = this.registeredAdapters.get(adapterId);
        if (!adapter || this.disabledAdapters.has(adapterId)) return false;
        if (typeof adapter.isConfigured === "function") {
            return adapter.isConfigured();
        }
        return true;
    }

    getAdapter(adapterId: string): StudyAdapter | undefined {
        return this.registeredAdapters.get(adapterId);
    }

    async discoverAdapters(adaptersRoot: string): Promise<void> {
        let entries: string[];
        try {
            entries = await readdir(adaptersRoot);
        } catch {
            return;
        }

        for (const entry of entries.sort()) {
            const pkgPath = path.join(adaptersRoot, entry, "package.json");
            try {
                const raw = await readFile(pkgPath, "utf8");
                const pkg = JSON.parse(raw) as { main?: string };
                if (!pkg.main) continue;
                const entryPath = path.resolve(adaptersRoot, entry, pkg.main);
                const mod = await import(entryPath);
                if (typeof mod.createStudyAdapter === "function") {
                    const factory =
                        mod.createStudyAdapter as () => StudyAdapter | null;
                    const adapter = factory();
                    if (adapter) this.registerAdapter(adapter);
                }
            } catch {
                // Adapter could not be loaded — skip silently.
            }
        }
    }

    async bootstrapAdapters(
        adaptersRoot: string,
        baseCtx: StudyBootstrapBaseCtx,
    ): Promise<void> {
        let entries: string[];
        try {
            entries = await readdir(adaptersRoot);
        } catch {
            return;
        }

        for (const entry of entries.sort()) {
            const pkgPath = path.join(adaptersRoot, entry, "package.json");

            let mod: Record<string, unknown>;
            try {
                const raw = await readFile(pkgPath, "utf8");
                const pkg = JSON.parse(raw) as { main?: string };
                if (!pkg.main) continue;
                const entryPath = path.resolve(adaptersRoot, entry, pkg.main);
                mod = await import(entryPath);
            } catch {
                continue;
            }

            if (typeof mod.bootstrapStudyAdapter !== "function") continue;

            const bootstrapFn = mod.bootstrapStudyAdapter as (
                ctx: StudyAdapterBootstrapCtx,
            ) => Promise<void> | void;

            const adapterCtx: StudyAdapterBootstrapCtx = {
                ...baseCtx,
                adapterId: entry,
                adapterRoot: path.join(adaptersRoot, entry),
                isAdapterEnabled: (adapterId = entry) =>
                    this.isAdapterEnabled(adapterId),
                registerRoute: (handler, gatewayId) => {
                    baseCtx.registerRoute(async (req, res, url) => {
                        if (!this.isAdapterEnabled(entry)) return false;
                        return handler(req, res, url);
                    }, gatewayId);
                },
            };

            try {
                await bootstrapFn(adapterCtx);
            } catch (err) {
                baseCtx.log?.(
                    "error",
                    `Study gateway: adapter "${entry}" bootstrap failed — skipping.`,
                    {
                        component: "study-gateway",
                        adapter: entry,
                        error: err instanceof Error ? err.message : String(err),
                    },
                );
            }
        }
    }
}
