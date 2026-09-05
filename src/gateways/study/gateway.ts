import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
    CapabilityStore,
    FlowApi,
    GatewayRegistry,
    AccessRole,
} from "@cognis/core";

const ACCESS_ROLE_RANK: Record<AccessRole, number> = {
    user: 1,
    teacher: 2,
    moderator: 3,
    admin: 4,
    owner: 5,
};

/** Neutral, immutable identity advertised by an external language package. */
export interface LanguagePackageDescriptor {
    readonly id: string;
    readonly publisher: string;
    readonly namespace: string;
    readonly version: string;
    readonly contentRevision: string;
    readonly license: {
        readonly id: string;
        readonly url?: string;
        readonly attribution?: string;
    };
    readonly schema: string;
    readonly content: string;
    readonly assets?: string;
}

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
    /** Optional SPA script URL for router-side module mounting. */
    readonly scriptUrl?: string;
    /** Optional SPA stylesheet URLs loaded before mount. */
    readonly stylesheets?: readonly string[];
    /** Lower numbers appear first. Defaults to 0. */
    readonly order?: number;
    /** Optional minimum role required to see this child component in sub-nav. */
    readonly minRole?: AccessRole;
}

/**
 * Normalized language descriptor consumed from an installed module's
 * `study:language:<code>` capability.
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
    /** Immutable package identity when the module installs declarative data. */
    readonly package?: LanguagePackageDescriptor;
    listChildComponents(): LanguageChildComponent[];
}

/**
 * Context passed to `bootstrapLanguageModule` so a module can register its
 * routes, static assets, and child components.
 */
export interface LanguageModuleBootstrapCtx {
    gateway: CoreStudyGateway;
    capabilities: CapabilityStore;
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
    readonly version?: string;
    readonly publisher?: string;
    readonly requires?: string[];
    /**
     * Returns adapter-specific config fields only. The gateway reserves the
     * `enabled` key for Administration runtime toggle state and injects it when
     * serving adapter config responses.
     */
    getConfig?(): Record<string, unknown>;
    /**
     * Receives adapter-specific config fields only. The gateway strips its
     * reserved Administration `enabled` toggle before calling this hook. The
     * gateway accepts both boolean and string forms ("true"/"false") of that
     * toggle from UI payloads before stripping it.
     */
    setConfig?(config: Record<string, unknown>): void;
    isConfigured?(): boolean;
}

export interface StudyAdapterInfo {
    id: string;
    name: string;
    version?: string;
    publisher?: string;
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
    flow: FlowApi;
    registerRoute(
        handler: (
            req: IncomingMessage,
            res: ServerResponse,
            url: URL,
        ) => Promise<boolean>,
        gatewayId?: string,
    ): void;
    registerStaticDir(urlPrefix: string, absoluteDir: string): void;
    registerAdapterStaticDir?(
        gatewayId: string,
        adapterId: string,
        absoluteDir: string,
    ): void;
    registerNavbarPlugin(scriptUrl: string, isEnabled?: () => boolean): void;
    registerSpaRoute?(route: {
        id: string;
        pattern: string;
        base: string;
        scriptUrl: string;
        stylesheets?: string[];
        isEnabled?: () => boolean;
    }): void;
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
}

/** Caller-neutral access check supplied by the Classes adapter. */
export interface StudyClassAccessCapability {
    canRead(
        classId: string,
        accountId: string,
        role: AccessRole,
    ): Promise<boolean>;
    canWrite(
        classId: string,
        accountId: string,
        role: AccessRole,
    ): Promise<boolean>;
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
        {
            module: LanguageModule;
            moduleId: string;
            moduleClass: string;
        }
    >();
    private readonly languageModuleAvailability = new Map<string, boolean>();

    registerAdapter(adapter: StudyAdapter): void {
        this.registeredAdapters.set(adapter.adapterId, adapter);
    }

    /**
     * Registers a language module and optional module-runtime metadata.
     *
     * moduleId/moduleClass are used by Study bootstrap to map language entries
     * to module enablement state; defaults map to extension-style language
     * modules when metadata is not provided.
     */
    registerLanguageModule(
        module: LanguageModule,
        options?: { moduleId?: string; moduleClass?: string },
    ): void {
        const moduleId =
            options?.moduleId ?? `study-language-${module.languageCode}`;
        const moduleClass = options?.moduleClass ?? "extension";
        this.registeredLanguageModules.set(module.languageCode, {
            module,
            moduleId,
            moduleClass,
        });
        this.languageModuleAvailability.set(
            moduleId,
            moduleClass.trim().toLowerCase() === "core",
        );
    }

    setLanguageModuleEnabled(moduleId: string, enabled: boolean): void {
        const hasLanguageModule = Array.from(
            this.registeredLanguageModules.values(),
        ).some((languageModule) => languageModule.moduleId === moduleId);
        if (!hasLanguageModule) return;
        this.languageModuleAvailability.set(moduleId, enabled);
    }

    isLanguageModuleEnabled(moduleId: string): boolean {
        const enabled = this.languageModuleAvailability.get(moduleId);
        return enabled === true;
    }

    listRegisteredLanguages(): Array<{
        code: string;
        name: string;
        flag: string;
    }> {
        return Array.from(this.registeredLanguageModules.values()).map(
            ({ module }) => ({
                code: module.languageCode,
                name: module.languageName,
                flag: module.languageFlag,
            }),
        );
    }

    listRegisteredLanguageModules(): Array<{
        code: string;
        name: string;
        flag: string;
        moduleId: string;
        moduleClass: string;
        enabled: boolean;
    }> {
        return Array.from(this.registeredLanguageModules.values()).map(
            ({ module, moduleId, moduleClass }) => ({
                code: module.languageCode,
                name: module.languageName,
                flag: module.languageFlag,
                moduleId,
                moduleClass,
                enabled: this.isLanguageModuleEnabled(moduleId),
            }),
        );
    }

    listChildComponents(
        languageCode: string,
        viewerRole: AccessRole = "user",
    ): LanguageChildComponent[] {
        const registered = this.registeredLanguageModules.get(languageCode);
        if (!registered) return [];
        return registered.module
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
            ...(adapter.version ? { version: adapter.version } : {}),
            ...(adapter.publisher ? { publisher: adapter.publisher } : {}),
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
        const { enabled, ...adapterConfig } = config;
        if (enabled === false || enabled === "false") {
            this.disabledAdapters.add(adapterId);
        } else if (enabled === true || enabled === "true") {
            this.disabledAdapters.delete(adapterId);
        }
        await Promise.resolve(adapter.setConfig(adapterConfig));
    }

    /**
     * Enables a study adapter by removing it from the disabled set.
     *
     * @param {string} adapterId
     * @returns {Promise<void>}
     * @throws {Error} not_found when the adapter is unknown.
     */
    async enableAdapter(adapterId: string): Promise<void> {
        if (!this.registeredAdapters.has(adapterId)) {
            throw new Error("not_found");
        }
        this.disabledAdapters.delete(adapterId);
    }

    /**
     * Disables a study adapter by adding it to the disabled set.
     *
     * @param {string} adapterId
     * @returns {Promise<void>}
     * @throws {Error} not_found when the adapter is unknown.
     */
    async disableAdapter(adapterId: string): Promise<void> {
        if (!this.registeredAdapters.has(adapterId)) {
            throw new Error("not_found");
        }
        this.disabledAdapters.add(adapterId);
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
                    const pkg = JSON.parse(raw) as {
                        main?: string;
                        version?: string;
                    };
                    if (!pkg.main) return;
                    const manifestRaw = await readFile(
                        path.join(adaptersRoot, entry, "manifest.json"),
                        "utf8",
                    );
                    const manifest = JSON.parse(manifestRaw) as {
                        publisher?: string;
                    };
                    const entryPath = path.resolve(
                        adaptersRoot,
                        entry,
                        pkg.main,
                    );
                    const mod = await import(entryPath);
                    if (typeof mod.createStudyAdapter === "function") {
                        const factory =
                            mod.createStudyAdapter as () => StudyAdapter | null;
                        const adapter = factory();
                        if (adapter && pkg.version) {
                            Object.assign(adapter, { version: pkg.version });
                        }
                        if (adapter && manifest.publisher) {
                            Object.assign(adapter, {
                                publisher: manifest.publisher,
                            });
                        }
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
        baseCtx: StudyBootstrapBaseCtx,
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

                if (typeof mod.bootstrapStudyAdapter !== "function") return;

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
