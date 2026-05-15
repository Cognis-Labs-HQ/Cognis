export type ModuleClass = "core" | "extension";

export interface ModuleManifest {
    id: string;
    name: string;
    version: string;
    publisher?: string;
    class: ModuleClass;
    coreApiVersion: string;
    capabilities: string[];
    /**
     * Gateway IDs that this module depends on. The admin UI surfaces these as
     * dependencies and prompts to enable any disabled dependency before the
     * module itself is enabled.
     */
    requires?: string[];
    entrypoints: {
        api?: string;
        ui?: string;
        cli?: string;
        db?: string;
    };
    ui?: {
        authTypingMessages?: string[];
        /**
         * Path (relative to module root) to a static directory whose contents
         * are served under /static/modules/<moduleId>/. Required for navbar
         * plugins and admin sections to be reachable by the browser.
         */
        staticDir?: string;
        /**
         * Path within staticDir to the navbar plugin ES module. When set, the
         * module extension router auto-registers it with the UI registry so the
         * dashboard layout loads it on every page while the module is enabled.
         */
        navbarPlugin?: string;
        /**
         * Path within staticDir to an admin section ES module. When set, the
         * module extension router auto-registers an admin section visible in
         * Administration → Components. The module must export
         * `createAdminSection({ i18n, apiFetch, escapeHtml, openPopup, showToast })`.
         */
        adminSection?: string;
    };
    files?: Array<{
        path: string;
        sha256: string;
    }>;
}
