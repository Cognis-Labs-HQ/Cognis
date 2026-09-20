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
    /** Requests guarded access to security-sensitive core extension surfaces. */
    privileged?: boolean;
    /** Marketplace-only repositories are hidden only when explicitly marked. */
    template?: boolean;
    coreApiVersion: string;
    capabilities: string[];
    /**
     * Stable UUIDs (or legacy IDs) of core components required by this module.
     * Every dependency must exist and be active before installation.
     */
    requires?: string[];
    /** External modules that must be installed and enabled first. */
    hardDependencies?: string[];
    /** Optional external modules offered during installation. */
    softDependencies?: string[];
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
        disabledApi?: string;
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
            type: "boolean" | "string" | "number" | "password";
            default?: boolean | string | number;
            /** Prevents enablement until the module-owned config supplies a value. */
            required?: boolean;
        }>;
        stringsBaseUrl?: string;
        /** Localized next steps shown after the module is enabled. */
        activationGuidance?: {
            titleKey: string;
            descriptionKey?: string;
            steps: Array<{
                id: string;
                labelKey: string;
                descriptionKey?: string;
                targets?: Array<{
                    kind: "adapter";
                    gatewayId: string;
                    adapterId: string;
                }>;
            }>;
        };
    };
    files?: Array<{
        path: string;
        sha256: string;
    }>;
}
