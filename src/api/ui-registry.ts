/**
 * Registry that gateways use to contribute admin-page sections, static
 * asset directories, page-level UI extensions, and navbar plugins. Core
 * never reads gateway-specific content — it only knows the section IDs,
 * labels, and script URLs returned here.
 */
export interface AdminSection {
    id: string;
    label: string;
    /** Browser-absolute URL of the ES module to dynamically import. */
    scriptUrl: string;
    /**
     * Optional base URL for component-specific locale strings.
     * The admin page will fetch `{stringsBaseUrl}/{locale}/strings.xml`
     * and merge those strings into the i18n instance passed to this section.
     */
    stringsBaseUrl?: string;
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
    /** Optional runtime predicate used to hide extensions while their owner is disabled. */
    isEnabled?: () => boolean;
}

/**
 * A navbar plugin that a gateway contributes to run on every dashboard
 * page. The module at `scriptUrl` is dynamically imported by the dashboard
 * layout after render. It calls `registerAvatarProvider` (exported from
 * the layout) to supply gateway-specific avatar and profile-link logic.
 */
export interface NavbarPlugin {
    /** Browser-absolute URL of the ES module to dynamically import. */
    scriptUrl: string;
    /** Optional runtime predicate used to hide plugins while their owner is disabled. */
    isEnabled?: () => boolean;
}

export interface AuthTypingMessage {
    id: string;
    textKey: string;
    ownerType?: "gateway" | "adapter" | "module" | "core";
    ownerId?: string;
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
    /**
     * Optional base URL for component-specific locale strings.
     * The settings page will fetch `{stringsBaseUrl}/{locale}/strings.xml`
     * and merge those strings into the i18n instance passed to this section.
     */
    stringsBaseUrl?: string;
    /** Optional runtime predicate used to hide sections while their owner is disabled. */
    isEnabled?: () => boolean;
}

export class UIRegistry {
    private readonly sections = new Map<string, AdminSection>();
    private readonly staticDirs = new Map<string, string>();
    private readonly adapterStaticDirs = new Map<string, string>();
    private readonly moduleStaticDirs = new Map<string, string>();
    private readonly pageExtensions = new Map<string, PageElement[]>();
    private readonly navbarPlugins: NavbarPlugin[] = [];
    private readonly authTypingMessages: AuthTypingMessage[] = [];
    private readonly settingsSections: SettingsSection[] = [];

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
     * import on every page. The plugin module should call
     * `registerAvatarProvider` (exported from dashboard-layout.js) to supply
     * avatar and profile-link update logic.
     */
    registerNavbarPlugin(plugin: NavbarPlugin): void {
        this.navbarPlugins.push(plugin);
    }

    registerAuthTypingMessage(message: AuthTypingMessage): void {
        this.authTypingMessages.push(message);
    }

    registerSettingsSection(section: SettingsSection): void {
        this.settingsSections.push(section);
    }

    listAdminSections(): AdminSection[] {
        return Array.from(this.sections.values());
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
        return this.pageExtensions.get(pageId) ?? [];
    }

    listNavbarPlugins(): NavbarPlugin[] {
        return [...this.navbarPlugins];
    }

    listAuthTypingMessages(): AuthTypingMessage[] {
        return [...this.authTypingMessages];
    }

    listSettingsSections(): SettingsSection[] {
        return [...this.settingsSections];
    }
}
