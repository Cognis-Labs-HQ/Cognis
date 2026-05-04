/**
 * Registry that gateways use to self-register their metadata at bootstrap
 * time. The gateway API routes expose this registry so the admin UI can
 * discover all active gateways and their adapter counts.
 */
export interface GatewayManifest {
    id: string;
    name: string;
    version: string;
    description?: string;
    publisher?: string;
}

export class GatewayRegistry {
    private readonly gateways = new Map<string, GatewayManifest>();

    register(manifest: GatewayManifest): void {
        this.gateways.set(manifest.id, manifest);
    }

    list(): GatewayManifest[] {
        return Array.from(this.gateways.values());
    }

    get(id: string): GatewayManifest | undefined {
        return this.gateways.get(id);
    }
}
