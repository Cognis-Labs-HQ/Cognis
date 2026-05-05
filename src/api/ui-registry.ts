/**
 * Registry that gateways use to contribute admin-page sections and static
 * asset directories. Core never reads gateway-specific content — it only
 * knows the section IDs, labels, and script URLs returned here.
 */
export interface AdminSection {
    id: string;
    label: string;
    /** Browser-absolute URL of the ES module to dynamically import. */
    scriptUrl: string;
}

export class UIRegistry {
    private readonly sections = new Map<string, AdminSection>();
    private readonly staticDirs = new Map<string, string>();

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

    listAdminSections(): AdminSection[] {
        return Array.from(this.sections.values());
    }

    getStaticDir(gatewayId: string): string | undefined {
        return this.staticDirs.get(gatewayId);
    }
}
