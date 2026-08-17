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
    coreApiVersion: string;
    capabilities: string[];
    /**
     * Gateway IDs that this module depends on. The admin UI surfaces these as
     * dependencies and prompts to enable any disabled dependency before the
     * module itself is enabled.
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
    };
    files?: Array<{
        path: string;
        sha256: string;
    }>;
}
