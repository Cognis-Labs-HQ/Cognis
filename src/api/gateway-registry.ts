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
    /**
     * When true, the gateway exposes a GET /api/v1/gateways/:id/adapters
     * endpoint and the admin UI will offer an adapters view for it.
     */
    hasAdapters?: boolean;
}

/** Runtime entry stored in the registry, extends the manifest with live state. */
export interface GatewayEntry extends GatewayManifest {
    /** "active" when the gateway is enabled, "disabled" when toggled off. */
    status: "active" | "disabled";
}

export class GatewayRegistry {
    private readonly gateways = new Map<string, GatewayEntry>();

    register(manifest: GatewayManifest): void {
        this.gateways.set(manifest.id, { ...manifest, status: "active" });
    }

    list(): GatewayEntry[] {
        return Array.from(this.gateways.values());
    }

    get(id: string): GatewayEntry | undefined {
        return this.gateways.get(id);
    }

    enable(id: string): boolean {
        const entry = this.gateways.get(id);
        if (!entry) return false;
        entry.status = "active";
        return true;
    }

    disable(id: string): boolean {
        const entry = this.gateways.get(id);
        if (!entry) return false;
        entry.status = "disabled";
        return true;
    }

    /**
     * Updates fields on an already-registered gateway entry. Only the keys
     * present in `updates` are changed; other fields are left untouched.
     * No-ops silently when the gateway ID is not registered.
     */
    patch(id: string, updates: Partial<GatewayManifest>): void {
        const entry = this.gateways.get(id);
        if (!entry) return;
        Object.assign(entry, updates);
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
