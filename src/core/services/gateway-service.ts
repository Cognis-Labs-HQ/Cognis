import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export interface GatewayManifest {
    id: string;
    name: string;
    version: string;
    description?: string;
    publisher?: string;
    /**
     * When true this gateway must successfully initialize before the server
     * starts accepting connections.
     */
    required?: boolean;
    /**
     * Gateway IDs that this gateway depends on. All listed IDs must be present
     * in the GatewayRegistry after the bootstrap phase.
     */
    requires?: string[];
    /**
     * When true, the gateway exposes a GET /api/v1/gateways/:id/adapters
     * endpoint and the admin UI will offer an adapters view for it.
     */
    hasAdapters?: boolean;
}

export interface GatewayEntry extends GatewayManifest {
    status: "active" | "disabled";
}

export class GatewayRegistry {
    private readonly gateways = new Map<string, GatewayEntry>();

    register(manifest: GatewayManifest): void {
        this.gateways.set(manifest.id, { ...manifest, status: "active" });
    }

    list(): GatewayEntry[] {
        return Array.from(this.gateways.values());
    }

    get(id: string): GatewayEntry | undefined {
        return this.gateways.get(id);
    }

    enable(id: string): boolean {
        const entry = this.gateways.get(id);
        if (!entry) return false;
        entry.status = "active";
        return true;
    }

    disable(id: string): boolean {
        const entry = this.gateways.get(id);
        if (!entry) return false;
        entry.status = "disabled";
        return true;
    }

    patch(id: string, updates: Partial<GatewayManifest>): void {
        const entry = this.gateways.get(id);
        if (!entry) return;
        Object.assign(entry, updates);
    }

    assertRequiredInitialized(requiredIds: readonly string[]): void {
        for (const id of requiredIds) {
            if (!this.gateways.has(id)) {
                throw new Error(
                    `Required gateway "${id}" did not initialize successfully.`,
                );
            }
        }
    }
}

export type BootstrapLog = (
    level: "debug" | "info" | "warn" | "error",
    message: string,
    meta?: Record<string, unknown>,
) => void;

export class CapabilityStore {
    private readonly store = new Map<string, unknown>();

    contribute(key: string, value: unknown): void {
        this.store.set(key, value);
    }

    get<T>(key: string): T | undefined {
        return this.store.get(key) as T | undefined;
    }
}

/**
 * Minimum context fields consumed by GatewayService.bootstrap(). The full
 * GatewayBootstrapContext in src/api/gateway-bootstrap.ts extends this with
 * API-specific fields (routeRegistry, uiRegistry, etc.) that individual
 * gateways consume but the orchestrator itself does not.
 */
export interface GatewayBootstrapBase {
    gatewayRegistry: GatewayRegistry;
    capabilities: CapabilityStore;
    log?: BootstrapLog;
}

type GatewayDirectoryManifest = {
    id?: string;
    required?: boolean;
    requires?: string[];
};

/**
 * Discovers and bootstraps all gateways under a root directory, validates
 * cross-gateway dependencies, and exposes runtime registry management.
 * Analogous to ModuleService for the gateway subsystem.
 */
export class GatewayService {
    constructor(private readonly registry: GatewayRegistry) {}

    list(): GatewayEntry[] {
        return this.registry.list();
    }

    get(id: string): GatewayEntry | undefined {
        return this.registry.get(id);
    }

    enable(id: string): boolean {
        return this.registry.enable(id);
    }

    disable(id: string): boolean {
        return this.registry.disable(id);
    }

    assertRequiredInitialized(requiredIds: readonly string[]): void {
        this.registry.assertRequiredInitialized(requiredIds);
    }

    /**
     * Discovers all gateway subdirectories under `gatewaysRoot`, reads each
     * directory's `manifest.json` to determine which gateways are required, then
     * dynamically imports and calls each gateway's `bootstrap(ctx)` function.
     *
     * The logging gateway is bootstrapped first (if present) so that its
     * contributed `logging:log` capability becomes available to all subsequent
     * gateways via `ctx.log`.
     *
     * Returns the list of gateway IDs declared as `required: true` in their
     * manifests. The caller should verify all returned IDs appear in the gateway
     * registry and refuse to start if any are absent.
     */
    async bootstrap<T extends GatewayBootstrapBase>(
        gatewaysRoot: string,
        ctx: T,
    ): Promise<readonly string[]> {
        let entries: string[];
        try {
            const dirEntries = await readdir(gatewaysRoot, {
                withFileTypes: true,
            });
            entries = dirEntries
                .filter((e) => e.isDirectory() && e.name !== "tests")
                .map((e) => e.name);
        } catch {
            return [];
        }

        const requiredIds: string[] = [];
        const gatewayManifests = new Map<
            string,
            { required: boolean; requires: string[] }
        >();

        entries.sort((a, b) => {
            if (a === "logging") return -1;
            if (b === "logging") return 1;
            if (a === "db") return -1;
            if (b === "db") return 1;
            return a.localeCompare(b);
        });

        for (const entry of entries) {
            const gatewayDir = path.join(gatewaysRoot, entry);

            let manifest: GatewayDirectoryManifest = {};
            try {
                const raw = await readFile(
                    path.join(gatewayDir, "manifest.json"),
                    "utf8",
                );
                manifest = JSON.parse(raw) as GatewayDirectoryManifest;
            } catch {
                // No manifest — gateway is treated as optional with no dependencies
            }

            const gatewayId = manifest.id ?? entry;
            if (manifest.required === true) {
                requiredIds.push(gatewayId);
            }

            gatewayManifests.set(gatewayId, {
                required: manifest.required === true,
                requires: Array.isArray(manifest.requires)
                    ? manifest.requires
                    : [],
            });

            const bootstrapUrl = pathToFileURL(
                path.join(gatewayDir, "bootstrap.ts"),
            ).href;

            try {
                const mod = (await import(bootstrapUrl)) as {
                    bootstrap?: (ctx: unknown) => Promise<void>;
                };
                if (typeof mod.bootstrap === "function") {
                    await mod.bootstrap(ctx);
                }
            } catch {
                // Bootstrap failure — required check will surface this as an error.
            }

            const manifestRequires = Array.isArray(manifest.requires)
                ? manifest.requires
                : [];
            if (
                manifestRequires.length > 0 &&
                ctx.gatewayRegistry.get(gatewayId)
            ) {
                ctx.gatewayRegistry.patch(gatewayId, {
                    requires: manifestRequires,
                });
            }

            // After the logging gateway runs, pull the contributed log function
            // into the context so all subsequent gateways can use it.
            if (gatewayId === "logging" && !ctx.log) {
                const contributed =
                    ctx.capabilities.get<BootstrapLog>("logging:log");
                if (contributed) {
                    (ctx as GatewayBootstrapBase).log = contributed;
                }
            }
        }

        // Validate cross-gateway dependencies now that all gateways have
        // bootstrapped and registered themselves.
        for (const [gatewayId, meta] of gatewayManifests) {
            for (const depId of meta.requires) {
                if (!ctx.gatewayRegistry.get(depId)) {
                    const message = `Gateway "${gatewayId}" requires gateway "${depId}" but it is not registered.`;
                    if (meta.required) {
                        throw new Error(message);
                    }
                    void ctx.log?.("warn", message, { gatewayId, depId });
                }
            }
        }

        return requiredIds;
    }
}
