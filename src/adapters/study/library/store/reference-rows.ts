import type { LibraryEntryInput } from "../types.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import { executeReferences } from "./reference-storage.js";

export function entryReferenceRows(
    input: Pick<LibraryEntryInput, "references" | "referenceGroups">,
) {
    return [
        ...(input.references ?? []).map((reference, index) => ({
            reference,
            groupIndex: -1,
            position: reference.position ?? index,
        })),
        ...Object.entries(input.referenceGroups ?? {}).flatMap(
            ([relation, groups]) =>
                groups.flatMap((group, groupIndex) =>
                    group.map((reference, position) => ({
                        reference: { ...reference, relation },
                        groupIndex,
                        position: reference.position ?? position,
                    })),
                ),
        ),
    ];
}

export function referenceTransformationValue(reference: {
    transformation?: { setId: string; path: string[] };
}) {
    return reference.transformation
        ? JSON.stringify(reference.transformation)
        : null;
}

/** Write canonical placements identically for new and edited cards. */
export async function insertEntryReferences(
    db: DbExecutor,
    sourceId: string,
    input: Pick<LibraryEntryInput, "references" | "referenceGroups">,
): Promise<void> {
    for (const row of entryReferenceRows(input)) {
        await executeReferences(db, {
            option: "INSERT",
            values: {
                source_entry_id: sourceId,
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
