import type { ModuleManifest } from "@cognis/core";

export interface ModuleState {
    moduleId: string;
    enabled: boolean;
}

export interface ModuleRuntimeGateway {
    listManifests(): Promise<ModuleManifest[]>;
    installFromZip(binary: Uint8Array): Promise<ModuleManifest>;
    enable(moduleId: string): Promise<ModuleState>;
    disable(moduleId: string): Promise<ModuleState>;
}
