import type { NamespaceDefinition } from "@cognis/core";

/**
 * In-memory registry of file namespaces, populated at gateway/adapter
 * bootstrap time via the `files:registerNamespace` capability. Mirrors the
 * RouteRegistry.registerPrefix pattern: each namespace id is claimed exactly
 * once by its owning component, and every subsequent file operation is
 * resolved against this registry to determine ACL ceilings and
 * cross-component access.
 */
export class NamespaceRegistry {
    private readonly namespaces = new Map<string, NamespaceDefinition>();

    register(definition: NamespaceDefinition): void {
        if (this.namespaces.has(definition.id)) {
            throw new Error(
                `Namespace "${definition.id}" is already registered by "${
                    this.namespaces.get(definition.id)?.ownerComponent
                }".`,
            );
        }
        this.namespaces.set(definition.id, definition);
    }

    get(namespaceId: string): NamespaceDefinition | undefined {
        return this.namespaces.get(namespaceId);
    }

    require(namespaceId: string): NamespaceDefinition {
        const definition = this.namespaces.get(namespaceId);
        if (!definition) {
            throw new Error(`Namespace "${namespaceId}" is not registered.`);
        }
        return definition;
    }

    list(): NamespaceDefinition[] {
        return Array.from(this.namespaces.values());
    }

    /** True when callerComponent may operate against this namespace at all. */
    componentAllowed(
        definition: NamespaceDefinition,
        callerComponent: string,
    ): boolean {
        if (callerComponent === "core") return true;
        if (callerComponent === definition.ownerComponent) return true;
        return definition.allowComponents?.includes(callerComponent) ?? false;
    }
}
