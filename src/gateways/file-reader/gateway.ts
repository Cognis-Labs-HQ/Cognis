import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { CapabilityStore, BootstrapLog } from "@cognis/core";

type RouteHandler = (
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
) => Promise<boolean>;

/**
 * Adapter interface for the file-reader gateway. Each adapter provides support
 * for one or more file types and optionally registers routes and static assets.
 */
export interface FileReaderAdapter {
    readonly adapterId: string;
    readonly adapterName: string;
    getSupportedTypes(): Array<{ ext: string; mimeType: string }>;
}

/**
 * Context passed to `bootstrapFileReaderAdapter` exported by each adapter.
 */
export interface FileReaderAdapterBootstrapCtx {
    adapterId: string;
    adapterRoot: string;
    capabilities: CapabilityStore;
    registerRoute(handler: RouteHandler, gatewayId?: string): void;
    registerAdapterStaticDir?(
        gatewayId: string,
        adapterId: string,
        dir: string,
    ): void;
    log?: BootstrapLog;
}

/**
 * Gateway that discovers and bootstraps file-reader adapters. Each adapter
 * contributes supported MIME types and rendering capabilities. The gateway
 * aggregates them into the `file-reader:supportedTypes` capability.
 */
export class CoreFileReaderGateway {
    private adapters: Map<string, FileReaderAdapter> = new Map();

    registerAdapter(adapter: FileReaderAdapter): void {
        this.adapters.set(adapter.adapterId, adapter);
    }

    listAdapters(): FileReaderAdapter[] {
        return Array.from(this.adapters.values());
    }

    getSupportedTypes(): Array<{ ext: string; mimeType: string }> {
        const result: Array<{ ext: string; mimeType: string }> = [];
        for (const adapter of this.adapters.values()) {
            result.push(...adapter.getSupportedTypes());
        }
        return result;
    }

    async discoverAdapters(adaptersRoot: string): Promise<void> {
        let entries: string[];
        try {
            entries = await readdir(adaptersRoot);
        } catch {
            return;
        }
        await Promise.all(
            entries.sort().map(async (entry) => {
                const pkgPath = path.join(adaptersRoot, entry, "package.json");
                try {
                    const raw = await readFile(pkgPath, "utf8");
                    const pkg = JSON.parse(raw) as { main?: string };
                    if (!pkg.main) return;
                    const entryPath = path.resolve(
                        adaptersRoot,
                        entry,
                        pkg.main,
                    );
                    const mod = await import(entryPath);
                    if (typeof mod.createFileReaderAdapter === "function") {
                        const factory =
                            mod.createFileReaderAdapter as () => FileReaderAdapter | null;
                        const adapter = factory();
                        if (adapter) this.registerAdapter(adapter);
                    }
                } catch {
                    // Adapter could not be loaded — skip silently.
                }
            }),
        );
    }

    async bootstrapAdapters(
        adaptersRoot: string,
        baseCtx: Omit<
            FileReaderAdapterBootstrapCtx,
            "adapterId" | "adapterRoot"
        >,
    ): Promise<void> {
        let entries: string[];
        try {
            entries = await readdir(adaptersRoot);
        } catch {
            return;
        }
        await Promise.all(
            entries.sort().map(async (entry) => {
                const pkgPath = path.join(adaptersRoot, entry, "package.json");
                let mod: Record<string, unknown>;
                try {
                    const raw = await readFile(pkgPath, "utf8");
                    const pkg = JSON.parse(raw) as { main?: string };
                    if (!pkg.main) return;
                    const entryPath = path.resolve(
                        adaptersRoot,
                        entry,
                        pkg.main,
                    );
                    mod = await import(entryPath);
                } catch {
                    return;
                }
                if (typeof mod.bootstrapFileReaderAdapter !== "function")
                    return;
                const bootstrapFn = mod.bootstrapFileReaderAdapter as (
                    ctx: FileReaderAdapterBootstrapCtx,
                ) => Promise<void> | void;
                const adapterCtx: FileReaderAdapterBootstrapCtx = {
                    ...baseCtx,
                    adapterId: entry,
                    adapterRoot: path.join(adaptersRoot, entry),
                };
                try {
                    await bootstrapFn(adapterCtx);
                } catch (err) {
                    baseCtx.log?.(
                        "error",
                        `File-reader gateway: adapter "${entry}" bootstrap failed — skipping.`,
                        {
                            component: "file-reader-gateway",
                            adapter: entry,
                            error:
                                err instanceof Error
                                    ? err.message
                                    : String(err),
                        },
                    );
                }
            }),
        );
    }
}
