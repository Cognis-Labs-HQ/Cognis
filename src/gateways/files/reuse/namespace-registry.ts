import type { NamespaceDefinition, NamespaceVisibility } from "@cognis/core";

const NAMESPACE_ID_PATTERN = /^[a-z][a-z0-9-]{1,62}$/;
const COMPONENT_ID_PATTERN = /^[a-z][a-z0-9-]{1,62}$/;
const VALID_VISIBILITIES = new Set<NamespaceVisibility>([
    "private-owner",
    "private-group",
    "component-managed",
]);

function assertIdentifier(kind: string, value: string, pattern: RegExp): void {
    if (!pattern.test(value)) {
        throw new Error(
            `${kind} "${value}" must be 2-63 lowercase letters, digits, or hyphens and start with a letter.`,
        );
    }
}

function normalize(definition: NamespaceDefinition): NamespaceDefinition {
    assertIdentifier("Namespace id", definition.id, NAMESPACE_ID_PATTERN);
    assertIdentifier(
        "Namespace owner component",
        definition.ownerComponent,
        COMPONENT_ID_PATTERN,
    );
    if (!VALID_VISIBILITIES.has(definition.acl.visibility)) {
        throw new Error(
            `Namespace "${definition.id}" declares unsupported ACL visibility "${definition.acl.visibility}".`,
        );
    }
    const allowComponents = Array.from(
        new Set(definition.allowComponents ?? []),
    ).sort();
    for (const componentId of allowComponents) {
        assertIdentifier(
            "Allowed component",
            componentId,
            COMPONENT_ID_PATTERN,
        );
    }
    return Object.freeze({
        id: definition.id,
        ownerComponent: definition.ownerComponent,
        acl: Object.freeze({ visibility: definition.acl.visibility }),
        ...(allowComponents.length > 0
            ? { allowComponents: Object.freeze(allowComponents) }
            : {}),
    });
}

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
        const normalized = normalize(definition);
        if (this.namespaces.has(normalized.id)) {
            throw new Error(
                `Namespace "${normalized.id}" is already registered by "${
                    this.namespaces.get(normalized.id)?.ownerComponent
                }".`,
            );
        }
        this.namespaces.set(normalized.id, normalized);
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
