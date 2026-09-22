import type { LibraryEntry } from "./types.js";

export function mapEntry(row: Record<string, unknown>): LibraryEntry {
    return {
        id: String(row.id),
        sourceRecordId:
            row.source_record_id === null || row.source_record_id === undefined
                ? undefined
                : String(row.source_record_id),
        displayId:
            row.display_id === null || row.display_id === undefined
                ? undefined
                : Number(row.display_id),
        hidden: row.hidden === true || Number(row.hidden) === 1,
        schemaId: String(row.schema_id),
        schemaVersion: Number(row.schema_version),
        layer: String(row.layer),
        language: String(row.language),
        label: String(row.label),
        fields: JSON.parse(String(row.fields_json ?? "{}")),
        references: [],
        scope: String(row.scope) as LibraryEntry["scope"],
        scopeId: String(row.scope_id),
        createdBy: String(row.created_by),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
    };
}
