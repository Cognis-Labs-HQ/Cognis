import { normalizeLocation } from "./dependencies.js";
import type { LibraryLocation } from "../types.js";
import { findLayer } from "../layers.js";
import type { StudyAudioCapability } from "@cognis/core";
import type { LibrarySchema } from "../types.js";
import type { LibraryActor, LibraryClassAccess } from "../contracts.js";
import type { LibraryEntry } from "../types.js";

export async function entryPermissions(
    actor: LibraryActor,
    entry: LibraryEntry,
    immutable: boolean,
    classAccess?: LibraryClassAccess,
    audioProvider?: StudyAudioCapability,
    schema?: LibrarySchema,
): Promise<LibraryEntry> {
    const administrator = actor.role === "admin" || actor.role === "owner";
    const owned =
        entry.createdBy === actor.accountId ||
        entry.owners?.includes(actor.accountId) ||
        (entry.scope === "user" && entry.scopeId === actor.accountId);
    const classWritable =
        entry.scope === "class" &&
        !!classAccess &&
        (await classAccess.canWrite(
            entry.scopeId,
            actor.accountId,
            actor.role,
        ));
    const canDelete =
        !entry.protected &&
        !immutable &&
        (entry.scope === "user"
            ? entry.scopeId === actor.accountId
            : entry.scope === "class"
              ? classWritable
              : administrator);
    const canEdit =
        !immutable &&
        ((administrator && entry.scope === "global") ||
            (!entry.protected &&
                entry.editable !== false &&
                (entry.scope === "class" ? classWritable : owned)));
    return {
        ...entry,
        ...(administrator &&
        entry.scope === "global" &&
        schema &&
        audioProvider?.supports(
            entry.language,
            findLayer(schema, entry.layer).semanticRole ?? "",
        )
            ? { canRegenerateAudio: true }
            : {}),
        canDelete,
        canEdit,
        editRequiresReview:
            canEdit && entry.scope === "global" && !administrator,
    };
}

export async function availableLocations(
    actor: LibraryActor,
    language?: string,
    classAccess?: LibraryClassAccess,
) {
    const personal = { scope: "user", scopeId: actor.accountId } as const;
    const readable: LibraryLocation[] = [
        { scope: "global", scopeId: "global" },
        personal,
    ];
    const writable: LibraryLocation[] = [personal];
    if (actor.role === "admin" || actor.role === "owner")
        writable.push({ scope: "global", scopeId: "global" });
    for (const classId of (await classAccess?.listReadable?.(
        actor.accountId,
        actor.role,
        language,
    )) ?? [])
        readable.push({ scope: "class", scopeId: classId });
    for (const classId of (await classAccess?.listWritable?.(
        actor.accountId,
        actor.role,
        language,
    )) ?? [])
        writable.push({ scope: "class", scopeId: classId });
    return { readable, writable };
}

export async function authorizeLocation(
    actor: LibraryActor,
    raw: LibraryLocation,
    write: boolean,
    classAccess?: LibraryClassAccess,
): Promise<LibraryLocation> {
    const location = normalizeLocation(raw, actor);
    if (location.scope === "global") {
        if (write && actor.role !== "admin" && actor.role !== "owner")
            throw new Error("forbidden");
        return location;
    }

    if (location.scope === "user") {
        if (location.scopeId !== actor.accountId) throw new Error("forbidden");
        return location;
    }

    if (!classAccess) throw new Error("class_access_unavailable");
    const allowed = write
        ? await classAccess.canWrite(
              location.scopeId!,
              actor.accountId,
              actor.role,
          )
        : await classAccess.canRead(
              location.scopeId!,
              actor.accountId,
              actor.role,
          );
    if (!allowed) throw new Error("forbidden");
    return location;
}

// A browse response may contain many cards in the same class. Share only the
// in-flight checks for this response; a later request must recheck permissions.
export function cacheClassWriteAccess(
    access?: LibraryClassAccess,
): LibraryClassAccess | undefined {
    if (!access) return undefined;
    const pending = new Map<string, Promise<boolean>>();
    return {
        canRead: access.canRead.bind(access),
        canWrite(classId, accountId, role) {
            const key = JSON.stringify([classId, accountId, role]);
            let result = pending.get(key);
            if (!result) {
                result = access.canWrite(classId, accountId, role);
                pending.set(key, result);
            }
            return result;
        },
    };
}
