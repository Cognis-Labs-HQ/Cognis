import type { LibraryStore } from "../store.js";
import { allInputReferences, validateEntrySelection } from "./dependencies.js";
import type { LibraryPushRequest } from "../types.js";
import type { LibraryEntry, LibraryLocation } from "../types.js";
import type { LibraryActor } from "../contracts.js";

export function pendingDeletionEntries(
    requests: readonly LibraryPushRequest[],
): Set<string> {
    return new Set(
        requests.flatMap(({ sourceEntryId, proposedEntry }) => [
            sourceEntryId,
            ...(proposedEntry ? allInputReferences(proposedEntry) : []).map(
                ({ entryId }) => entryId,
            ),
        ]),
    );
}

export async function authorizeDeletion(
    actor: LibraryActor,
    entries: readonly LibraryEntry[],
    pendingSources: Set<string>,
    immutable: (entry: LibraryEntry) => boolean,
    authorize: (
        actor: LibraryActor,
        location: LibraryLocation,
        write: boolean,
    ) => Promise<unknown>,
    reviewedRelocation = false,
): Promise<void> {
    // Only a globally authorized administrator may remove foreign private
    // dependents while approving a shared-to-private relocation.
    if (reviewedRelocation) {
        if (actor.role !== "admin" && actor.role !== "owner")
            throw new Error("forbidden");
        await authorize(actor, { scope: "global", scopeId: "global" }, true);
        if (
            entries.some(({ createdBy }) =>
                createdBy.startsWith("content-pack:"),
            )
        )
            throw new Error("provider_content");
    }
    if (entries.some(({ id }) => pendingSources.has(id)))
        throw new Error("request_pending");
    if (entries.some((entry) => immutable(entry)))
        throw new Error("immutable_layer");
    if (entries.some((entry) => entry.protected))
        throw new Error("protected_content");
    if (
        actor.role !== "admin" &&
        actor.role !== "owner" &&
        entries.some((entry) =>
            entry.scope === "class"
                ? false
                : entry.scope !== "user" || entry.scopeId !== actor.accountId,
        )
    ) {
        throw new Error("forbidden");
    }
    for (const entry of entries) {
        if (reviewedRelocation && entry.scope === "user") continue;
        await authorize(
            actor,
            { scope: entry.scope, scopeId: entry.scopeId },
            true,
        );
    }
}

export async function planDeletion(
    store: LibraryStore,
    actor: LibraryActor,
    entryIds: readonly string[],
    immutable: (entry: LibraryEntry) => boolean,
    authorize: (
        actor: LibraryActor,
        location: LibraryLocation,
        write: boolean,
    ) => Promise<unknown>,
) {
    validateEntrySelection(entryIds);
    const plannedIds = await store.resolveDeletionCascade(
        entryIds,
        undefined,
        true,
    );
    validateEntrySelection(plannedIds);
    const entries = await Promise.all(plannedIds.map((id) => store.get(id)));
    if (entries.some((entry) => !entry)) throw new Error("entry_not_found");
    const resolved = entries as LibraryEntry[];
    const pendingSources = pendingDeletionEntries(
        await store.listPushRequests("pending"),
    );
    await authorizeDeletion(
        actor,
        resolved,
        pendingSources,
        immutable,
        authorize,
    );
    return {
        entryIds: plannedIds,
        entries: resolved.map(({ id, label }) => ({ id, label })),
    };
}

export async function notifyDeletedEntries(
    entries: readonly LibraryEntry[],
    actor: LibraryActor,
    notify?: (
        entries: readonly LibraryEntry[],
        actor: LibraryActor,
    ) => Promise<unknown>,
    log?: (
        level: string,
        message: string,
        metadata: Record<string, unknown>,
    ) => unknown,
): Promise<void> {
    try {
        await notify?.(entries, actor);
    } catch (error) {
        await log?.("error", "Study cascade notification failed.", {
            component: "study-library",
            operation: "notify-deletion",
            accountId: actor.accountId,
            errorName: error instanceof Error ? error.name : "Error",
        });
    }
}
