export type ModuleClass = "core" | "extension";

export interface ModuleManifest {
    /** Immutable identity used by dependency and lifecycle contracts. */
    uuid: string;
    id: string;
    name: string;
    version: string;
    publisher?: string;
    class: ModuleClass;
    enabledByDefault?: boolean;
    /** Marketplace-only repositories are hidden only when explicitly marked. */
    template?: boolean;
    coreApiVersion: string;
    capabilities: string[];
    /**
     * Stable UUIDs (or legacy IDs) of core components required by this module.
     * Every dependency must exist and be active before installation.
     */
    requires?: string[];
    summary?: string;
    description?: string;
    categories?: string[];
    tags?: string[];
    license?: string;
    homepage?: string;
    repository?: string;
    support?: string;
    assets?: {
        icon?: string;
        banner?: string;
        screenshots?: string[];
    };
    entrypoints: {
        bootstrap?: string;
        api?: string;
        ui?: string;
        cli?: string;
        db?: string;
    };
    ui?: {
        authTypingMessages?: string[];
        /** Fields rendered by Cognis for the module-owned configuration API. */
        preferences?: Array<{
            key: string;
            labelKey: string;
            descriptionKey?: string;
            type: "boolean" | "string" | "number";
            default?: boolean | string | number;
            /** Prevents enablement until the module-owned config supplies a value. */
            required?: boolean;
        }>;
        stringsBaseUrl?: string;
    };
    files?: Array<{
        path: string;
        sha256: string;
    }>;
}
