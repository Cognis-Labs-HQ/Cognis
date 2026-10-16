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
