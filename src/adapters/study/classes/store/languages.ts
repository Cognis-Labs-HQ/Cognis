import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import { rowToStudyLanguage } from "./rows.js";
import type { StudyLanguageRow } from "./types.js";

export async function listStudyLanguages(
    db: DbExecutor,
    onlyAvailable = false,
): Promise<StudyLanguageRow[]> {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "study_languages",
        columns: ["code", "name", "flag", "available", "active", "sort_order"],
        ...(onlyAvailable
            ? { where: [{ column: "available", value: 1 }] }
            : {}),
        orderBy: [
            { column: "sort_order", direction: "ASC" },
            { column: "code", direction: "ASC" },
        ],
    });
    return (result.rows ?? []).map((row) =>
        rowToStudyLanguage(row as Record<string, unknown>),
    );
}

export async function upsertStudyLanguage(
    db: DbExecutor,
    row: Partial<StudyLanguageRow> & { code: string },
): Promise<StudyLanguageRow> {
    await db.executeCommand({
        option: "INSERT",
        table: "study_languages",
        values: {
            code: row.code,
            name: row.name ?? "",
            flag: row.flag ?? "",
            available: row.available !== false ? 1 : 0,
            active: row.active === true ? 1 : 0,
            sort_order: row.sortOrder ?? 0,
        },
        conflict: {
            action: "update",
            target: ["code"],
        },
    });
    const result = await db.executeCommand({
        option: "SELECT",
        table: "study_languages",
        columns: ["code", "name", "flag", "available", "active", "sort_order"],
        where: [{ column: "code", value: row.code }],
    });
    const foundRow = result.rows?.[0];
    if (!foundRow) {
        return {
            code: row.code,
            name: row.name ?? "",
            flag: row.flag ?? "",
            available: row.available !== false,
            active: row.active ?? false,
            sortOrder: row.sortOrder ?? 0,
        };
    }
    return rowToStudyLanguage(foundRow as Record<string, unknown>);
}
