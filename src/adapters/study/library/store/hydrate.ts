import { executeReferences } from "./reference-storage.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import { mapEntry } from "../entry-row.js";
import type { LibraryEntry } from "../types.js";

export async function hydrateEntries(
    db: DbExecutor,
    rows: Record<string, unknown>[],
): Promise<LibraryEntry[]> {
    if (!rows.length) return [];
    const references = await executeReferences(db, {
        option: "SELECT",
        where: [
            {
                column: "source_entry_id",
                operator: "IN",
                value: rows.map((row) => String(row.id)),
            },
        ],
    });
    const bySource = new Map<string, Record<string, unknown>[]>();
    for (const row of references.rows ?? []) {
        const id = String(row.source_entry_id);
        const group = bySource.get(id) ?? [];
        group.push(row);
        bySource.set(id, group);
    }
    return rows.map((row) =>
        hydrateEntry(row, bySource.get(String(row.id)) ?? []),
    );
}

function hydrateEntry(
    row: Record<string, unknown>,
    referenceRows: Record<string, unknown>[],
): LibraryEntry {
    const entry = mapEntry(row);
    entry.references = [];
    entry.referenceGroups = {};
    const byRelation = new Map<string, (typeof entry.references)[]>();
    for (const reference of referenceRows) {
        const value = {
            entryId: String(reference.target_entry_id),
            relation: String(reference.relation),
            position: Number(reference.position),
            ...(reference.transformation_json
                ? {
                      transformation: JSON.parse(
                          String(reference.transformation_json),
                      ),
                  }
                : {}),
        };
        const groupIndex = Number(reference.group_index);
        if (groupIndex < 0) {
            entry.references.push(value);
            continue;
        }
        const groups = byRelation.get(value.relation) ?? [];
        byRelation.set(value.relation, groups);
        (groups[groupIndex] ??= []).push(value);
    }
    entry.references.sort((left, right) => left.position! - right.position!);
    for (const [relation, groups] of byRelation) {
        entry.referenceGroups[relation] = groups
            .filter((group) => Array.isArray(group))
            .map((group) =>
                group.sort((left, right) => left.position! - right.position!),
            );
    }
    return entry;
}
