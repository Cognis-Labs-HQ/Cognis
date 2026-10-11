import { findLayer, validateFields, validateReferences } from "../layers.js";
import type {
    LibraryEntry,
    LibraryEntryInput,
    LibrarySchema,
} from "../types.js";

export function validateUpdateProposal(
    current: LibraryEntry,
    proposed: LibraryEntryInput,
    schema: LibrarySchema,
    targets: ReadonlyMap<string, LibraryEntry>,
): void {
    if (
        proposed.schemaId !== current.schemaId ||
        proposed.layer !== current.layer
    )
        throw new Error("entry_identity_immutable");
    if (!proposed.label?.trim() || proposed.label.length > 500)
        throw new Error("invalid_label");
    const fields = proposed.fields ?? {};
    validateFields(schema, proposed.layer, fields);
    for (const field of findLayer(schema, proposed.layer).fields ?? []) {
        if (
            field.input?.immutable &&
            JSON.stringify(fields[field.id]) !==
                JSON.stringify(current.fields?.[field.id])
        )
            throw new Error(`field_immutable:${field.id}`);
    }
    validateReferences(
        schema,
        proposed.layer,
        proposed.references ?? [],
        targets,
        proposed.referenceGroups,
        fields,
    );
}
