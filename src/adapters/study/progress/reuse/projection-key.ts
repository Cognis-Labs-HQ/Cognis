import type { ContentIdentity } from "../types.js";

/** Encode every identity dimension without database-forbidden delimiter bytes. */
export function projectionKey(
    actorId: string,
    content: ContentIdentity,
): string {
    return JSON.stringify([
        actorId,
        content.schema,
        content.layer,
        content.language,
        content.contentId,
    ]);
}
