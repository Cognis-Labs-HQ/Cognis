import { CONTENT_CLASS_PATTERN } from "../identifiers.js";
import type { LibraryEntryInput } from "../types.js";

export function validateEntryInput(input: LibraryEntryInput): void {
    if (!input.label?.trim() || input.label.length > 500)
        throw new Error("invalid_label");
    if (input.class !== undefined && !CONTENT_CLASS_PATTERN.test(input.class))
        throw new Error("invalid_content_class");
    if (
        input.tags !== undefined &&
        (!Array.isArray(input.tags) ||
            input.tags.some(
                (tag) =>
                    typeof tag !== "string" || !tag.trim() || tag.length > 50,
            ) ||
            input.tags.length > 25)
    )
        throw new Error("invalid_tags");
    if (input.hidden !== undefined && typeof input.hidden !== "boolean")
        throw new Error("invalid_hidden");
    if (
        input.alwaysShowDefinition !== undefined &&
        typeof input.alwaysShowDefinition !== "boolean"
    )
        throw new Error("invalid_always_show_definition");
}
