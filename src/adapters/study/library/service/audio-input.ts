import { referencedTransformation } from "../ui/reuse/transformations.js";
import type {
    LibraryEntry,
    LibrarySchema,
    LibraryReferenceInput,
} from "../types.js";

export function transformedAudioEntry(
    entry: LibraryEntry,
    schema: LibrarySchema,
    transformation?: LibraryReferenceInput["transformation"],
    fieldId = "audio",
): LibraryEntry {
    if (transformation === undefined) return entry;
    if (
        !transformation ||
        typeof transformation.setId !== "string" ||
        !Array.isArray(transformation.path) ||
        transformation.path.length > 8 ||
        transformation.path.some((value) => typeof value !== "string")
    )
        throw new Error("invalid_reference_transformation");
    const resolved = referencedTransformation(entry, schema, transformation);
    if (!resolved) throw new Error("invalid_reference_transformation");
    return {
        ...entry,
        label: resolved.node.value,
        fields: {
            ...entry.fields,
            [fieldId]: undefined,
            pronunciation: [resolved.node.pronunciation],
        },
    };
}
