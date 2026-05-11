import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { CapabilityStore, GatewayRegistry } from "@cognis/core";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { SupportedDbType } from "../db/executor.js";
import type { AdapterConfigStore } from "./adapter-config-store.js";

/**
 * Implemented by each social adapter and registered during discovery so the
 * gateway can list, configure, enable, and disable adapters before their
 * runtime routes bootstrap. This mirrors the Notification gateway sender
 * lifecycle: discovery establishes adapter identity; bootstrap wires routes.
 */
export interface SocialAdapter {
    readonly adapterId: string;
    readonly adapterName: string;
    readonly requires?: string[];
    getConfig?(): Record<string, unknown>;
    setConfig?(config: Record<string, unknown>): void;
    isConfigured?(): boolean;
}

export interface SocialAdapterInfo {
    id: string;
    name: string;
    active: boolean;
    requires?: string[];
}

/**
 * Context passed to `bootstrapSocialAdapter` when a social adapter exports
 * that function. Mirrors the notify gateway's adapter bootstrap contract.
 * Adapters self-register during discovery and use bootstrap for runtime wiring.
 */
export interface SocialAdapterBootstrapCtx {
    gateway: CoreSocialGateway;
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
    registerAdapterStaticDir?(
        gatewayId: string,
        adapterId: string,
        absoluteDir: string,
    ): void;
    registerNavbarPlugin(scriptUrl: string, isEnabled?: () => boolean): void;
    registerStaticDir(urlPrefix: string, absoluteDir: string): void;
    registerAuthTypingMessage?(message: {
        id: string;
        textKey: string;
        ownerType: "gateway" | "adapter";
        ownerId: string;
    }): void;
    log?: (level: string, msg: string, meta?: Record<string, unknown>) => void;
    dbExecutor?: DbExecutor;
    dbType?: SupportedDbType;
    isGatewayEnabled(): boolean;
    isAdapterEnabled(adapterId?: string): boolean;
}

/** Base context supplied by the caller of `bootstrapAdapters`. */
type SocialBootstrapBaseCtx = Omit<
    SocialAdapterBootstrapCtx,
    "adapterId" | "adapterRoot" | "isAdapterEnabled"
>;

export class CoreSocialGateway {
    private readonly registeredAdapters = new Map<string, SocialAdapter>();
    private readonly disabledAdapters = new Set<string>();
    private readonly adapterRequires = new Map<string, string[]>();

    constructor(private readonly configStore?: AdapterConfigStore) {}

    registerAdapter(adapter: SocialAdapter, requires?: string[]): void {
        this.registeredAdapters.set(adapter.adapterId, adapter);
        const effectiveRequires = requires ?? adapter.requires;
        if (effectiveRequires && effectiveRequires.length > 0) {
            this.adapterRequires.set(adapter.adapterId, effectiveRequires);
        }
    }

    listAdapters(): SocialAdapterInfo[] {
        return Array.from(this.registeredAdapters.values()).map((adapter) => {
            const requires = this.adapterRequires.get(adapter.adapterId);
            return {
                id: adapter.adapterId,
                name: adapter.adapterName,
                active:
                    !this.disabledAdapters.has(adapter.adapterId) &&
                    (typeof adapter.isConfigured === "function"
                        ? adapter.isConfigured()
                        : true),
                ...(requires && requires.length > 0 ? { requires } : {}),
            };
        });
    }

    isAdapterEnabled(adapterId: string): boolean {
        const adapter = this.registeredAdapters.get(adapterId);
        if (!adapter || this.disabledAdapters.has(adapterId)) return false;
        if (typeof adapter.isConfigured === "function") {
            return adapter.isConfigured();
        }
        return true;
    }

    getAdapter(adapterId: string): SocialAdapter | undefined {
        return this.registeredAdapters.get(adapterId);
    }

    getAdapterConfig(adapterId: string): Record<string, unknown> | null {
        const adapter = this.registeredAdapters.get(adapterId);
        if (!adapter) return null;
        return {
            ...(typeof adapter.getConfig === "function"
                ? adapter.getConfig()
                : {}),
            enabled: !this.disabledAdapters.has(adapterId),
        };
    }

    async saveAdapterConfig(
        adapterId: string,
        config: Record<string, unknown>,
    ): Promise<void> {
        const adapter = this.registeredAdapters.get(adapterId);
        if (!adapter) return;
        const { enabled, ...adapterConfig } = config;
        if (enabled === false || enabled === "false") {
            this.disabledAdapters.add(adapterId);
        } else {
            this.disabledAdapters.delete(adapterId);
        }
        if (typeof adapter.setConfig === "function") {
            adapter.setConfig(adapterConfig);
        }
        await this.configStore?.saveConfig(adapterId, config);
    }

    async loadPersistedConfigs(): Promise<void> {
        if (!this.configStore) return;
        for (const adapter of this.registeredAdapters.values()) {
            const config = await this.configStore.getConfig(adapter.adapterId);
            if (!config) continue;
            if (config.enabled === false || config.enabled === "false") {
                this.disabledAdapters.add(adapter.adapterId);
            }
            if (typeof adapter.setConfig === "function") {
                const { enabled, ...adapterConfig } = config;
                adapter.setConfig(adapterConfig);
            }
        }
    }

    async enableAdapter(adapterId: string): Promise<void> {
        this.disabledAdapters.delete(adapterId);
        const existing = (await this.configStore?.getConfig(adapterId)) ?? null;
        await this.configStore?.saveConfig(adapterId, {
            ...(existing ?? {}),
            enabled: true,
        });
    }

    async disableAdapter(adapterId: string): Promise<void> {
        this.disabledAdapters.add(adapterId);
        const existing = (await this.configStore?.getConfig(adapterId)) ?? null;
        await this.configStore?.saveConfig(adapterId, {
            ...(existing ?? {}),
            enabled: false,
        });
    }

    async discoverAdapters(adaptersRoot: string): Promise<void> {
        let entries: string[];
        try {
            entries = await readdir(adaptersRoot);
        } catch {
            return;
        }

        entries.sort(sortSocialAdapterEntries);

        for (const entry of entries) {
            const pkgPath = path.join(adaptersRoot, entry, "package.json");
            try {
                const raw = await readFile(pkgPath, "utf8");
                const pkg = JSON.parse(raw) as { main?: string };
                if (!pkg.main) continue;

                let requires: string[] | undefined;
                try {
                    const manifestRaw = await readFile(
                        path.join(adaptersRoot, entry, "manifest.json"),
                        "utf8",
                    );
                    const manifest = JSON.parse(manifestRaw) as {
                        requires?: string[];
                    };
                    if (Array.isArray(manifest.requires)) {
                        requires = manifest.requires;
                    }
                } catch {
                    // No manifest — adapter has no declared dependencies.
                }

                const entryPath = path.resolve(adaptersRoot, entry, pkg.main);
                const mod = await import(entryPath);
                if (typeof mod.createSocialAdapter === "function") {
                    const factory =
                        mod.createSocialAdapter as () => SocialAdapter | null;
                    const adapter = factory();
                    if (adapter) this.registerAdapter(adapter, requires);
                }
            } catch {
                // Adapter could not be loaded — skip silently, matching notify.
            }
        }
    }

    /**
     * Bootstraps all discovered social adapters under `adaptersRoot`. Discovery
     * runs separately so admin listings and slider state are available before
     * route/static/UI registration, matching the Notification gateway lifecycle.
     */
    async bootstrapAdapters(
        adaptersRoot: string,
        baseCtx: SocialBootstrapBaseCtx,
    ): Promise<void> {
        let entries: string[];
        try {
            entries = await readdir(adaptersRoot);
        } catch {
            return;
        }

        entries.sort(sortSocialAdapterEntries);

        for (const entry of entries) {
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

            if (typeof mod.bootstrapSocialAdapter !== "function") continue;

            const bootstrapFn = mod.bootstrapSocialAdapter as (
                ctx: SocialAdapterBootstrapCtx,
            ) => Promise<void> | void;

            const adapterCtx: SocialAdapterBootstrapCtx = {
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
                    `Social gateway: adapter "${entry}" bootstrap failed — skipping.`,
                    {
                        component: "social-gateway",
                        adapter: entry,
                        error: err instanceof Error ? err.message : String(err),
                    },
                );
            }
        }
    }
}

function sortSocialAdapterEntries(a: string, b: string): number {
    if (a === "profile") return -1;
    if (b === "profile") return 1;
    return a.localeCompare(b);
}
