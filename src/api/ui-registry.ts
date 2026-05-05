/**
 * Registry that gateways use to contribute admin-page sections, static
 * asset directories, and page-level UI extensions. Core never reads
 * gateway-specific content — it only knows the section IDs, labels, and
 * script URLs returned here.
 */
export interface AdminSection {
    id: string;
    label: string;
    /** Browser-absolute URL of the ES module to dynamically import. */
    scriptUrl: string;
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
}

export class UIRegistry {
    private readonly sections = new Map<string, AdminSection>();
    private readonly staticDirs = new Map<string, string>();
    private readonly pageExtensions = new Map<string, PageElement[]>();

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

    listAdminSections(): AdminSection[] {
        return Array.from(this.sections.values());
    }

    getStaticDir(gatewayId: string): string | undefined {
        return this.staticDirs.get(gatewayId);
    }

    /**
     * Returns all UI elements registered for the given page ID. Returns an
     * empty array when no extensions have been registered for that page.
     */
    listPageExtensions(pageId: string): PageElement[] {
        return this.pageExtensions.get(pageId) ?? [];
    }
}
