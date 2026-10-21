import type {
    LibrarySchema,
    LibraryReferenceInput,
    LibraryEntry,
} from "../types.js";
import { referencedTransformation } from "../ui/reuse/transformations.js";

export function validateReferenceTransformation(
    schema: LibrarySchema,
    reference: LibraryReferenceInput,
    target: LibraryEntry,
): void {
    if (!reference.transformation) return;
    if (
        !reference.transformation.path.length ||
        !referencedTransformation(target, schema, reference.transformation)
    )
        throw new Error("invalid_reference_transformation");
}
