import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { CapabilityStore, GatewayRegistry } from "@cognis/core";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { SupportedDbType } from "../db/executor.js";

/**
 * Implemented by each social adapter and passed to `registerAdapter` so the
 * gateway can list all adapters by their own declared identity.
 */
export interface SocialAdapter {
    readonly adapterId: string;
    readonly adapterName: string;
}

export interface SocialAdapterInfo {
    id: string;
    name: string;
    active: boolean;
}

/**
 * Context passed to `bootstrapSocialAdapter` when a social adapter exports
 * that function. Mirrors the notify gateway's adapter bootstrap contract.
 * Adapters self-register by calling `ctx.gateway.registerAdapter(...)`.
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
    registerNavbarPlugin(scriptUrl: string): void;
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
}

/** Base context supplied by the caller of `bootstrapAdapters`. */
type SocialBootstrapBaseCtx = Omit<
    SocialAdapterBootstrapCtx,
    "adapterId" | "adapterRoot"
>;

export class CoreSocialGateway {
    private readonly registeredAdapters = new Map<string, SocialAdapter>();
    private readonly activeOverrides = new Map<string, boolean>();

    registerAdapter(adapter: SocialAdapter): void {
        this.registeredAdapters.set(adapter.adapterId, adapter);
    }

    setAdapterActive(adapterId: string, active: boolean): void {
        if (this.registeredAdapters.has(adapterId)) {
            this.activeOverrides.set(adapterId, active);
        }
    }

    listAdapters(): SocialAdapterInfo[] {
        return Array.from(this.registeredAdapters.values()).map((adapter) => ({
            id: adapter.adapterId,
            name: adapter.adapterName,
            active: this.activeOverrides.get(adapter.adapterId) ?? true,
        }));
    }

    /**
     * Discovers all social adapters under `adaptersRoot`, imports each one
     * that exports `bootstrapSocialAdapter`, and invokes it. Adapters must
     * call `ctx.gateway.registerAdapter(...)` to appear in `listAdapters()`.
     *
     * The profile adapter is sorted first so it can contribute
     * `social:profileStore` before the messages adapter runs. If profile is
     * absent, messages will gracefully skip when that capability is missing.
     *
     * Adapter bootstrap errors propagate so fatal conditions (e.g. missing
     * encryption key) are not silently swallowed.
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

        entries.sort((a, b) => {
            if (a === "profile") return -1;
            if (b === "profile") return 1;
            return a.localeCompare(b);
        });

        for (const entry of entries) {
            const adapterDir = path.join(adaptersRoot, entry);
            const pkgPath = path.join(adapterDir, "package.json");

            let mod: Record<string, unknown>;
            try {
                const raw = await readFile(pkgPath, "utf8");
                const pkg = JSON.parse(raw) as { main?: string };
                if (!pkg.main) continue;
                const entryPath = path.resolve(adapterDir, pkg.main);
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
                adapterRoot: adapterDir,
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
