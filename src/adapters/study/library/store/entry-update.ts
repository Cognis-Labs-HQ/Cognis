import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import type { LibraryEntryInput } from "../types.js";
import {
    entryReferenceRows,
    referenceTransformationValue,
} from "./reference-rows.js";

export async function replaceEntryContent(
    db: DbExecutor,
    id: string,
    input: LibraryEntryInput,
    providerModified: boolean,
): Promise<void> {
    await db.executeCommand({
        option: "UPDATE",
        table: "study_library_entries",
        set: {
            schema_version: input.schemaVersion,
            label: input.label,
            class: input.class ?? null,
            tags_json: JSON.stringify(input.tags ?? []),
            hidden: input.hidden === true,
            always_show_definition: input.alwaysShowDefinition === true,
            fields_json: JSON.stringify(input.fields ?? {}),
            search_text:
                `${input.label} ${(input.tags ?? []).join(" ")} ${JSON.stringify(input.fields ?? {})}`
                    .normalize()
                    .toLocaleLowerCase(),
            provider_modified: providerModified,
            updated_at: new Date().toISOString(),
        },
        where: [{ column: "id", value: id }],
    });
    await db.executeCommand({
        option: "DELETE",
        table: "study_library_references",
        where: [{ column: "source_entry_id", value: id }],
    });
    for (const row of entryReferenceRows(input)) {
        await db.executeCommand({
            option: "INSERT",
            table: "study_library_references",
            values: {
                source_entry_id: id,
                target_entry_id: row.reference.entryId,
                relation: row.reference.relation,
                group_index: row.groupIndex,
                position: row.position,
                transformation_json: referenceTransformationValue(
                    row.reference,
                ),
            },
        });
    }
}
