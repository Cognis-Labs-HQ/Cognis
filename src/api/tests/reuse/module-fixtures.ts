import type {
    MarketplaceModule,
    ModuleManifest,
    ModuleSource,
} from "@cognis/core";

export function moduleManifest(
    overrides: Partial<ModuleManifest> = {},
): ModuleManifest {
    return {
        id: "example",
        uuid: "11111111-1111-4111-8111-111111111111",
        name: "Example",
        version: "1.0.0",
        class: "extension",
        coreApiVersion: "v1",
        capabilities: [],
        entrypoints: {},
        ...overrides,
    };
}

export function marketplaceModule(
    overrides: Partial<MarketplaceModule> = {},
): MarketplaceModule {
    return {
        ...moduleManifest(),
        cloneUrl: "https://example.test/modules/example.git",
        sourceUuid: "example-source",
        installed: false,
        branches: [],
        releases: [],
        defaultBranch: "main",
        updateAvailable: false,
        ...overrides,
    };
}

export function moduleSource(
    overrides: Partial<ModuleSource> = {},
): ModuleSource {
    return {
        uuid: "example-source",
        name: "Example source",
        provider: "github",
        namespace: "example",
        baseUrl: "https://api.github.com",
        ...overrides,
    };
}
