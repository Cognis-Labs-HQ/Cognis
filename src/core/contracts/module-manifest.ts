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
    files?: Array<{
        path: string;
        sha256: string;
    }>;
}
