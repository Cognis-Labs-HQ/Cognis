/**
 * Registry that gateways use to contribute admin-page sections, static
 * asset directories, page-level UI extensions, and navbar plugins. Core
 * never reads gateway-specific content — it only knows the section IDs,
 * labels, and script URLs returned here.
 */
import type { RoleAccessPolicy } from "@cognis/core";
import { readFileSync } from "node:fs";
import path from "node:path";

export interface AdminSection {
    id: string;
    label: string;
    /** Browser-absolute URL of the ES module to dynamically import. */
    scriptUrl: string;
    /** Optional role access policy for this section. */
    access?: RoleAccessPolicy;
    /** Optional runtime predicate used to hide sections while their owner is disabled. */
    isEnabled?: () => boolean;
    /**
     * Optional base URL for component-specific locale strings.
     * The admin page will fetch `{stringsBaseUrl}/{locale}/strings.xml`
     * and merge those strings into the i18n instance passed to this section.
     */
    stringsBaseUrl?: string | string[];
    ownerId?: string;
}

/**
 * A single element that a gateway contributes to a specific core page.
 * The core page imports the module at `scriptUrl` and passes its factory
 * function to the page composer.
 */
export interface PageElement {
    id: string;
    label: string;
    /** Browser-absolute URL of the ES module to dynamically import. */
    scriptUrl: string;
    /** Optional role access policy for this extension. */
    access?: RoleAccessPolicy;
    /** Optional runtime predicate used to hide extensions while their owner is disabled. */
    isEnabled?: () => boolean;
    ownerId?: string;
}

/**
 * A navbar plugin that a gateway contributes to run on every dashboard
 * page. The module at `scriptUrl` is dynamically imported by the dashboard
 * layout after render and contributes any optional UI behavior through
 * `uiCtx.capabilities`.
 */
export interface NavbarPlugin {
    /** Browser-absolute URL of the ES module to dynamically import. */
    scriptUrl: string;
    /** UI capabilities contributed when this plugin is imported. */
    providesCapabilities?: string[];
    /** Optional role access policy for this plugin. */
    access?: RoleAccessPolicy;
    /** Optional runtime predicate used to hide plugins while their owner is disabled. */
    isEnabled?: () => boolean;
    ownerId?: string;
}

export interface UiCapabilityProvider {
    scriptUrl: string;
    providesCapabilities: string[];
    isEnabled?: () => boolean;
}

/**
 * A client-side SPA route contributed by a gateway or adapter. The app router
 * fetches these routes at runtime and dynamically imports `scriptUrl` when a
 * matching path is navigated to.
 */
export interface SpaRoute {
    /** Stable route identifier for diagnostics and test assertions. */
    id: string;
    /** Regex source string, e.g. "^/messages(?:/[^/]+)?$". */
    pattern: string;
    /** Base route used by the app router to track section transitions. */
    base: string;
    /** Browser-absolute URL of the ES module to dynamically import. */
    scriptUrl: string;
    /** Optional stylesheet URLs to ensure before mount. */
    stylesheets?: string[];
    /** UI capabilities that must be contributed before importing the route. */
    requiredCapabilities?: string[];
    /** Provider scripts selected by core for the required UI capabilities. */
    capabilityScripts?: string[];
    /** Optional role access policy for this route. */
    access?: RoleAccessPolicy;
    /** Optional runtime predicate used to hide routes while owner is disabled. */
    isEnabled?: () => boolean;
    ownerId?: string;
    /** Immutable UUID of an owning external module. */
    ownerUuid?: string;
    /** Explicit opt-in allowing another component to embed this page. */
    componentPage?: {
        labelKey: string;
        descriptionKey: string;
        modes: Array<"overlay" | "fullscreen" | "pip">;
    };
}

export interface AuthTypingMessage {
    id: string;
    textKey: string;
    ownerType?: "gateway" | "adapter" | "module" | "core";
    ownerId?: string;
    access?: RoleAccessPolicy;
    isEnabled?: () => boolean;
}

/**
 * A settings section contributed by a gateway or adapter. The settings page
 * dynamically imports the module at `scriptUrl` and calls
 * `createSettingsSection({ i18n, root, markDirty })` to build the section.
 */
export interface SettingsSection {
    id: string;
    label: string;
    /** Browser-absolute URL of the ES module to dynamically import. */
    scriptUrl: string;
    /** Optional role access policy for this section. */
    access?: RoleAccessPolicy;
    /**
     * Optional base URL for component-specific locale strings.
     * The settings page will fetch `{stringsBaseUrl}/{locale}/strings.xml`
     * and merge those strings into the i18n instance passed to this section.
     */
    stringsBaseUrl?: string | string[];
    /** Optional runtime predicate used to hide sections while their owner is disabled. */
    isEnabled?: () => boolean;
    ownerId?: string;
}

export class UIRegistry {
    private readonly assetManifest: Record<string, string>;
    private readonly sections = new Map<string, AdminSection>();
    private readonly staticDirs = new Map<string, string>();
    private readonly adapterStaticDirs = new Map<string, string>();
    private readonly moduleStaticDirs = new Map<string, string>();
    private readonly pageExtensions = new Map<string, PageElement[]>();
    private readonly navbarPlugins: NavbarPlugin[] = [];
    private readonly capabilityProviders: UiCapabilityProvider[] = [];
    private readonly spaRoutes: SpaRoute[] = [];
    private readonly authTypingMessages: AuthTypingMessage[] = [];
    private readonly settingsSections: SettingsSection[] = [];

    constructor(manifestPath = process.env.COGNIS_UI_ASSET_MANIFEST) {
        this.assetManifest = manifestPath
            ? (JSON.parse(
                  readFileSync(path.resolve(manifestPath), "utf8"),
              ) as Record<string, string>)
            : {};
    }

    resolveAssetUrl(assetUrl: string): string {
        return this.assetManifest[assetUrl] ?? assetUrl;
    }

    listAssetManifest(): Record<string, string> {
        return { ...this.assetManifest };
    }

    private resolveDescriptor<T>(descriptor: T): T {
        if (Array.isArray(descriptor)) {
            return descriptor.map((value) =>
                this.resolveDescriptor(value),
            ) as T;
        }
        if (descriptor && typeof descriptor === "object") {
            return Object.fromEntries(
                Object.entries(descriptor).map(([key, value]) => [
                    key,
                    typeof value === "string"
                        ? this.resolveAssetUrl(value)
                        : this.resolveDescriptor(value),
                ]),
            ) as T;
        }
        return descriptor;
    }

    registerAdminSection(section: AdminSection): void {
        this.sections.set(section.id, section);
    }

    /**
     * Maps a URL prefix segment (gatewayId) to an absolute filesystem path.
     * Registered directories are served under /static/gateways/:gatewayId/.
     */
    registerStaticDir(gatewayId: string, absoluteDir: string): void {
        this.staticDirs.set(gatewayId, absoluteDir);
    }

    /**
     * Maps a `<gatewayId>/<adapterId>` pair to an absolute filesystem path.
     * Registered directories are served under
     * `/static/adapters/<gatewayId>/<adapterId>/`. Adapter-owned UI assets
     * (navbar plugins, page scripts, styles) should live next to the adapter
     * code on disk and be exposed via this method.
     */
    registerAdapterStaticDir(
        gatewayId: string,
        adapterId: string,
        absoluteDir: string,
    ): void {
        this.adapterStaticDirs.set(`${gatewayId}/${adapterId}`, absoluteDir);
    }

    /**
     * Registers a UI element to be injected into a named core page.
     * The page ID is a stable string agreed on by convention (e.g. "dashboard",
     * "settings"). The element's `scriptUrl` points to a browser ES module that
     * exports a `createPageElement(deps)` factory function.
     */
    registerPageExtension(pageId: string, element: PageElement): void {
        const existing = this.pageExtensions.get(pageId) ?? [];
        existing.push(element);
        this.pageExtensions.set(pageId, existing);
    }

    /**
     * Registers a navbar plugin that the dashboard layout will dynamically
     * import on every page. The plugin module contributes optional navbar
     * behavior through `uiCtx.capabilities`.
     */
    registerNavbarPlugin(plugin: NavbarPlugin): void {
        this.navbarPlugins.push(plugin);
    }

    registerSpaRoute(route: SpaRoute): void {
        if (route.componentPage) {
            const { labelKey, descriptionKey, modes } = route.componentPage;
            if (
                !route.ownerUuid?.match(
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
                ) ||
                !/^[a-z0-9._-]+$/.test(labelKey) ||
                !/^[a-z0-9._-]+$/.test(descriptionKey) ||
                !Array.isArray(modes) ||
                modes.length === 0 ||
                modes.some(
                    (mode) => !["overlay", "fullscreen", "pip"].includes(mode),
                )
            ) {
                throw new TypeError("invalid_component_page_declaration");
            }
        }
        this.spaRoutes.push(route);
    }

    registerAuthTypingMessage(message: AuthTypingMessage): void {
        this.authTypingMessages.push(message);
    }

    registerSettingsSection(section: SettingsSection): void {
        this.settingsSections.push(section);
    }

    listAdminSections(): AdminSection[] {
        return this.resolveDescriptor(Array.from(this.sections.values()));
    }

    getStaticDir(gatewayId: string): string | undefined {
        return this.staticDirs.get(gatewayId);
    }

    getAdapterStaticDir(
        gatewayId: string,
        adapterId: string,
    ): string | undefined {
        return this.adapterStaticDirs.get(`${gatewayId}/${adapterId}`);
    }

    /**
     * Registers a URL prefix under /static/modules/ that the server serves
     * from the given absolute filesystem directory. Modules call this via the
     * `registerStaticDir` hook on their bootstrap context (the gateway routes
     * prefixes that start with "modules/" here instead of to staticDirs).
     */
    registerModuleStaticDir(urlPrefix: string, absoluteDir: string): void {
        this.moduleStaticDirs.set(urlPrefix, absoluteDir);
    }

    unregisterModuleContributions(moduleId: string): void {
        for (const [id, section] of this.sections) {
            if (section.ownerId === moduleId) this.sections.delete(id);
        }
        for (const [pageId, extensions] of this.pageExtensions) {
            const retained = extensions.filter(
                (extension) => extension.ownerId !== moduleId,
            );
            if (retained.length) this.pageExtensions.set(pageId, retained);
            else this.pageExtensions.delete(pageId);
        }
        this.removeOwned(this.navbarPlugins, moduleId);
        this.removeOwned(this.spaRoutes, moduleId);
        this.removeOwned(this.authTypingMessages, moduleId);
        this.removeOwned(this.settingsSections, moduleId);
        for (const prefix of this.moduleStaticDirs.keys()) {
            if (prefix === moduleId || prefix.startsWith(`${moduleId}/`)) {
                this.moduleStaticDirs.delete(prefix);
            }
        }
    }

    private removeOwned<T extends { ownerId?: string }>(
        registrations: T[],
        moduleId: string,
    ): void {
        for (let index = registrations.length - 1; index >= 0; index--) {
            if (registrations[index].ownerId === moduleId) {
                registrations.splice(index, 1);
            }
        }
    }

    /**
     * Given the path portion after /static/modules/ (e.g.
     * "study/languages/ja/components/hiragana-alphabet/app.js"), finds the
     * longest registered module URL prefix and returns the directory and the
     * relative file path within it. Returns undefined when no prefix matches.
     */
    resolveModulePath(
        urlPath: string,
    ): { dir: string; relPath: string } | undefined {
        let bestPrefix = "";
        let bestDir: string | undefined;
        for (const [prefix, dir] of this.moduleStaticDirs) {
            if (urlPath === prefix || urlPath.startsWith(prefix + "/")) {
                if (prefix.length > bestPrefix.length) {
                    bestPrefix = prefix;
                    bestDir = dir;
                }
            }
        }
        if (!bestDir) return undefined;
        const relPath =
            urlPath.length > bestPrefix.length
                ? urlPath.slice(bestPrefix.length + 1)
                : "";
        return { dir: bestDir, relPath };
    }

    /**
     * Returns all UI elements registered for the given page ID. Returns an
     * empty array when no extensions have been registered for that page.
     */
    listPageExtensions(pageId: string): PageElement[] {
        return this.resolveDescriptor(this.pageExtensions.get(pageId) ?? []);
    }

    listNavbarPlugins(): NavbarPlugin[] {
        return this.resolveDescriptor([...this.navbarPlugins]);
    }

    listCapabilityProviders(): UiCapabilityProvider[] {
        return this.resolveDescriptor(
            this.listActiveCapabilityProviders().filter(
                (provider) => provider.providesCapabilities?.length,
            ),
        );
    }

    registerCapabilityProvider(provider: UiCapabilityProvider): void {
        this.capabilityProviders.push(provider);
    }

    private listActiveCapabilityProviders(): UiCapabilityProvider[] {
        return [...this.navbarPlugins, ...this.capabilityProviders].filter(
            (provider) => !provider.isEnabled || provider.isEnabled(),
        );
    }

    hasActiveCapabilityProvider(capabilityId: string): boolean {
        return this.listActiveCapabilityProviders().some((plugin) =>
            plugin.providesCapabilities?.includes(capabilityId),
        );
    }

    listSpaRoutes(): SpaRoute[] {
        const activeProviders = this.listActiveCapabilityProviders();
        return this.resolveDescriptor(
            this.spaRoutes.flatMap((route) => {
                if (route.isEnabled && !route.isEnabled()) return [];
                const providers = (route.requiredCapabilities ?? []).map(
                    (capability) =>
                        activeProviders.find((plugin) =>
                            plugin.providesCapabilities?.includes(capability),
                        ),
                );
                if (providers.some((provider) => !provider)) return [];
                return [
                    {
                        ...route,
                        capabilityScripts: providers.map(
                            (provider) => provider!.scriptUrl,
                        ),
                    },
                ];
            }),
        );
    }

    resolveSpaRoute(pathname: string): SpaRoute | undefined {
        return this.listSpaRoutes().find((route) => {
            if (route.isEnabled && !route.isEnabled()) return false;
            try {
                return new RegExp(route.pattern).test(pathname);
            } catch {
                // Invalid-pattern fallback: exclude the route via the return below.
                return false;
            }
        });
    }

    listAuthTypingMessages(): AuthTypingMessage[] {
        return [...this.authTypingMessages];
    }

    listSettingsSections(): SettingsSection[] {
        return this.resolveDescriptor([...this.settingsSections]);
    }
}
