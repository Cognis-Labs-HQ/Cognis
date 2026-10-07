import type { LibraryActor } from "../contracts.js";
import type {
    LibraryEntry,
    LibraryEntryInput,
    LibraryLocation,
    LibraryReferenceInput,
} from "../types.js";
export function allInputReferences(
    input: LibraryEntryInput,
): LibraryReferenceInput[] {
    return [
        ...(input.references ?? []),
        ...Object.entries(input.referenceGroups ?? {}).flatMap(
            ([relation, groups]) =>
                Array.isArray(groups)
                    ? groups.flatMap((group) =>
                          Array.isArray(group)
                              ? group.map((reference) => ({
                                    ...reference,
                                    relation,
                                }))
                              : [],
                      )
                    : [],
        ),
    ];
}
export function canComposeAtLocation(
    component: LibraryEntry,
    composite: LibraryLocation,
): boolean {
    if (composite.scope === "user")
        return (
            component.scope !== "user" ||
            component.scopeId === composite.scopeId
        );
    if (component.scope === "global") return true;
    return (
        composite.scope === "class" &&
        component.scope === "class" &&
        component.scopeId === composite.scopeId
    );
}
export function normalizeLocation(
    location: LibraryLocation,
    actor: LibraryActor,
): LibraryLocation {
    if (!location || !["global", "class", "user"].includes(location.scope))
        throw new Error("invalid_scope");
    if (location.scopeId !== undefined && typeof location.scopeId !== "string")
        throw new Error("invalid_scope_id");
    if (location.scope === "global")
        return { scope: "global", scopeId: "global" };
    if (location.scope === "user")
        return { scope: "user", scopeId: location.scopeId ?? actor.accountId };
    if (!location.scopeId?.trim()) throw new Error("class_id_required");
    return { scope: "class", scopeId: location.scopeId.trim() };
}

export async function validateDependencyVisibility(
    input: LibraryEntryInput,
    destination: LibraryLocation,
    read: (id: string) => Promise<LibraryEntry | null>,
    sourceId?: string,
): Promise<Map<string, LibraryEntry>> {
    const pending = allInputReferences(input).map(({ entryId }) => ({
        id: entryId,
        location: destination,
    }));
    const visited = new Set<string>();
    const targets = new Map<string, LibraryEntry>();
    while (pending.length) {
        const { id, location } = pending.pop()!;
        if (id === sourceId) throw new Error("reference_cycle");
        const key = `${id}:${location.scope}:${location.scopeId}`;
        if (visited.has(key)) continue;
        visited.add(key);
        const target = targets.get(id) ?? (await read(id));
        if (!target) throw new Error("reference_not_found");
        if (!canComposeAtLocation(target, location))
            throw new Error("reference_visibility_too_low");
        targets.set(id, target);
        pending.push(
            ...allInputReferences(target).map(({ entryId }) => ({
                id: entryId,
                location: { scope: target.scope, scopeId: target.scopeId },
            })),
        );
    }
    return targets;
}

export function validateEntrySelection(entryIds: readonly string[]): void {
    if (entryIds.length === 0 || entryIds.length > 500)
        throw new Error("invalid_entry_selection");
    if (new Set(entryIds).size !== entryIds.length)
        throw new Error("duplicate_entry_selection");
    for (const entryId of entryIds) {
        if (!entryId.trim() || entryId.length > 200)
            throw new Error("invalid_entry_id");
    }
}

export async function validatePendingPublicationEdits(
    requests: readonly import("../types.js").LibraryPushRequest[],
    entryId: string,
    input: LibraryEntryInput,
    read: (id: string) => Promise<LibraryEntry | null>,
): Promise<void> {
    for (const request of requests) {
        if (
            request.sourceEntryId === entryId &&
            !["update", "merge"].includes(request.kind ?? "promotion")
        )
            await validateDependencyVisibility(
                input,
                request.destination,
                read,
                entryId,
            );
    }
}
