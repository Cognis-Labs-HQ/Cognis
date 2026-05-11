import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { CapabilityStore, GatewayRegistry } from "@cognis/core";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { SupportedDbType } from "../db/executor.js";
import type { AccessRole } from "../../api/auth/access-tokens.js";

const ACCESS_ROLE_RANK: Record<AccessRole, number> = {
    user: 1,
    teacher: 2,
    moderator: 3,
    admin: 4,
    owner: 5,
};

/**
 * A single study activity or tool for a language, registered by its parent
 * language module. The UI builds a sub-navigation menu from these descriptors.
 */
export interface LanguageChildComponent {
    /** Unique within the language, e.g. 'hiragana-alphabet'. */
    readonly id: string;
    /** Display name shown in the sub-nav, e.g. 'Hiragana Alphabet'. */
    readonly label: string;
    /** URL the router navigates to, e.g. '/study/ja/hiragana'. */
    readonly pageUrl: string;
    /** Lower numbers appear first. Defaults to 0. */
    readonly order?: number;
    /** Optional minimum role required to see this child component in sub-nav. */
    readonly minRole?: AccessRole;
}

/**
 * Implemented by each language module. A language module is not an adapter;
 * it is a content module that lives under
 * `src/modules/study/languages/<code>/` and registers itself with the Study
 * gateway at bootstrap time.
 */
export interface LanguageModule {
    /** BCP 47 language code, e.g. 'ja', 'ko', 'zh-TW'. */
    readonly languageCode: string;
    /** Human-readable name in the language itself, e.g. '日本語'. */
    readonly languageName: string;
    /** Emoji flag, e.g. '🇯🇵'. */
    readonly languageFlag: string;
    /** Semver version of this module. */
    readonly version: string;
    listChildComponents(): LanguageChildComponent[];
}

/**
 * Context passed to `bootstrapLanguageModule` so a module can register its
 * routes, static assets, and child components.
 */
export interface LanguageModuleBootstrapCtx {
    gateway: CoreStudyGateway;
    languageCode: string;
    moduleRoot: string;
    registerChildRoute(
        handler: (
            req: IncomingMessage,
            res: ServerResponse,
            url: URL,
        ) => Promise<boolean>,
    ): void;
    registerStaticDir(urlPrefix: string, absoluteDir: string): void;
    log?(
        level: string,
        message: string,
        meta?: Record<string, unknown>,
    ): void | Promise<void>;
}

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
    registerPageExtension(
        pageId: string,
        element: {
            id: string;
            label: string;
            scriptUrl: string;
            isEnabled?: () => boolean;
        },
    ): void;
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
    private readonly registeredLanguageModules = new Map<
        string,
        LanguageModule
    >();

    registerAdapter(adapter: StudyAdapter): void {
        this.registeredAdapters.set(adapter.adapterId, adapter);
    }

    registerLanguageModule(module: LanguageModule): void {
        this.registeredLanguageModules.set(module.languageCode, module);
    }

    listChildComponents(
        languageCode: string,
        viewerRole: AccessRole = "user",
    ): LanguageChildComponent[] {
        const module = this.registeredLanguageModules.get(languageCode);
        if (!module) return [];
        return module
            .listChildComponents()
            .filter((childComponent) => {
                if (!childComponent.minRole) return true;
                return (
                    ACCESS_ROLE_RANK[viewerRole] >=
                    ACCESS_ROLE_RANK[childComponent.minRole]
                );
            })
            .slice()
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
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

    getAdapterConfig(adapterId: string): Record<string, unknown> | null {
        const adapter = this.registeredAdapters.get(adapterId);
        if (!adapter) return null;
        if (typeof adapter.getConfig !== "function") return null;
        return adapter.getConfig();
    }

    async saveAdapterConfig(
        adapterId: string,
        config: Record<string, unknown>,
    ): Promise<void> {
        const adapter = this.registeredAdapters.get(adapterId);
        if (!adapter || typeof adapter.setConfig !== "function") return;
        await Promise.resolve(adapter.setConfig(config));
    }

    async discoverAdapters(adaptersRoot: string): Promise<void> {
        let entries: string[];
        try {
            entries = await readdir(adaptersRoot);
        } catch {
            return;
        }

        for (const entry of entries.sort()) {
            // Legacy adapter is intentionally skipped because Japanese now ships
            // as a Study language module (see src/modules/study/languages/ja/).
            if (entry === "japanese") continue;
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
            // Legacy adapter is intentionally skipped because Japanese now ships
            // as a Study language module (see src/modules/study/languages/ja/).
            if (entry === "japanese") continue;
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

    async discoverLanguageModules(modulesRoot: string): Promise<void> {
        let entries: string[];
        try {
            entries = await readdir(modulesRoot);
        } catch {
            return;
        }

        for (const entry of entries.sort()) {
            const pkgPath = path.join(modulesRoot, entry, "package.json");
            try {
                const raw = await readFile(pkgPath, "utf8");
                const pkg = JSON.parse(raw) as { main?: string };
                if (!pkg.main) continue;
                const entryPath = path.resolve(modulesRoot, entry, pkg.main);
                const mod = await import(entryPath);
                if (typeof mod.createLanguageModule === "function") {
                    const factory =
                        mod.createLanguageModule as () => LanguageModule | null;
                    const languageModule = factory();
                    if (languageModule)
                        this.registerLanguageModule(languageModule);
                }
            } catch {
                // Language module could not be loaded — skip silently.
            }
        }
    }

    async bootstrapLanguageModules(
        modulesRoot: string,
        baseCtx: Omit<
            LanguageModuleBootstrapCtx,
            "languageCode" | "moduleRoot" | "gateway"
        >,
    ): Promise<void> {
        let entries: string[];
        try {
            entries = await readdir(modulesRoot);
        } catch {
            return;
        }

        for (const entry of entries.sort()) {
            const pkgPath = path.join(modulesRoot, entry, "package.json");

            let mod: Record<string, unknown>;
            try {
                const raw = await readFile(pkgPath, "utf8");
                const pkg = JSON.parse(raw) as { main?: string };
                if (!pkg.main) continue;
                const entryPath = path.resolve(modulesRoot, entry, pkg.main);
                mod = await import(entryPath);
            } catch {
                continue;
            }

            if (typeof mod.bootstrapLanguageModule !== "function") continue;

            const bootstrapFn = mod.bootstrapLanguageModule as (
                ctx: LanguageModuleBootstrapCtx,
            ) => Promise<void> | void;

            const moduleCtx: LanguageModuleBootstrapCtx = {
                ...baseCtx,
                gateway: this,
                languageCode: entry,
                moduleRoot: path.join(modulesRoot, entry),
            };

            try {
                await bootstrapFn(moduleCtx);
            } catch (err) {
                baseCtx.log?.(
                    "error",
                    `Study gateway: language module "${entry}" bootstrap failed — skipping.`,
                    {
                        component: "study-gateway",
                        languageModule: entry,
                        error: err instanceof Error ? err.message : String(err),
                    },
                );
            }
        }
    }
}
