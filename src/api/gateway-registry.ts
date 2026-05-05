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
    /**
     * When true this gateway must successfully initialize before the server
     * starts accepting connections. Core checks all required gateways after
     * the bootstrap phase and refuses to start if any are absent.
     */
    required?: boolean;
    /**
     * Gateway IDs that this gateway depends on. All listed IDs must be present
     * in the GatewayRegistry after the bootstrap phase; if any are missing and
     * this gateway is itself marked `required`, the server will refuse to start.
     * Optional gateways can still declare requirements — bootstrap will log a
     * warning if the dep is absent but will not abort startup.
     */
    requires?: string[];
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

    /**
     * Verifies that every gateway ID listed in `requiredIds` has successfully
     * registered. Throws with the first missing ID if any are absent.
     */
    assertRequiredInitialized(requiredIds: readonly string[]): void {
        for (const id of requiredIds) {
            if (!this.gateways.has(id)) {
                throw new Error(
                    `Required gateway "${id}" did not initialize successfully.`,
                );
            }
        }
    }
}
