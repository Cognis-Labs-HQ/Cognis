import { createHash } from "node:crypto";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import type {
    StructuredDbCommand,
    StructuredDbCommandResult,
} from "../../../../gateways/db/reuse/db-command.js";
import type { StructuredDbColumnDef } from "../../../../gateways/db/reuse/db-table.js";

type WithoutTable<T> = T extends StructuredDbCommand ? Omit<T, "table"> : never;

type ReferenceCommand = WithoutTable<
    Exclude<StructuredDbCommand, { option: "UPDATE" }>
>;

const FLAT = "study_library_references";
const GROUPED = "study_library_reference_groups";

function groupId(values: Record<string, unknown>): string {
    return createHash("sha256")
        .update(
            JSON.stringify([
                values.source_entry_id,
                values.target_entry_id,
                values.relation,
                Number(values.group_index),
                Number(values.position),
            ]),
        )
        .digest("hex");
}

/** Flat edges retain their established key; grouped placements have an independent identity. */
export async function executeReferences(
    db: DbExecutor,
    command: ReferenceCommand,
): Promise<StructuredDbCommandResult> {
    if (command.option === "INSERT") {
        const grouped = Number(command.values.group_index) >= 0;
        return db.executeCommand({
            ...command,
            table: grouped ? GROUPED : FLAT,
            values: grouped
                ? { ...command.values, reference_id: groupId(command.values) }
                : command.values,
        });
    }
    const results = [];
    for (const table of [FLAT, GROUPED])
        results.push(await db.executeCommand({ ...command, table }));
    return {
        rows: results.flatMap((result) => result.rows ?? []),
        rowCount: results.reduce(
            (count, result) => count + (result.rowCount ?? 0),
            0,
        ),
    };
}

export async function ensureReferenceStorage(db: DbExecutor): Promise<void> {
    const columns: StructuredDbColumnDef[] = [
        { name: "source_entry_id", type: "text", notNull: true },
        { name: "target_entry_id", type: "text", notNull: true },
        { name: "relation", type: "text", notNull: true, default: "contains" },
        { name: "position", type: "integer", notNull: true, default: 0 },
        { name: "group_index", type: "integer", notNull: true, default: -1 },
        { name: "transformation_json", type: "text" },
    ];
    await db.ensureTable({
        name: FLAT,
        columns,
        primaryKey: [
            "source_entry_id",
            "target_entry_id",
            "relation",
            "position",
        ],
    });
    await db.ensureTable({
        name: GROUPED,
        columns: [
            { name: "reference_id", type: "text", primaryKey: true },
            ...columns,
        ],
        indexes: [
            { columns: ["source_entry_id"] },
            { columns: ["target_entry_id"] },
        ],
    });
    // Keep grouped placements in their own keyed store before accepting graph writes.
    await db.transaction(async (tx) => {
        const grouped = await tx.executeCommand({
            option: "SELECT",
            table: FLAT,
            where: [{ column: "group_index", operator: ">=", value: 0 }],
        });
        for (const row of grouped.rows ?? []) {
            if (!(Number(row.group_index) >= 0)) continue;
            await executeReferences(tx, {
                option: "INSERT",
                values: row,
                conflict: { action: "ignore" },
            });
        }
        await tx.executeCommand({
            option: "DELETE",
            table: FLAT,
            where: [{ column: "group_index", operator: ">=", value: 0 }],
        });
    });
}
