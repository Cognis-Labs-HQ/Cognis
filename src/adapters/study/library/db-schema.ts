import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import { ensureEntryStateSchema } from "./entry-state.js";
import { ensurePushRequestSchema } from "./push-requests.js";

export async function ensureLibraryStoreSchema(db: DbExecutor): Promise<void> {
    await db.ensureTable({
        name: "study_library_schemas",
        columns: [
            { name: "schema_id", type: "text", notNull: true },
            { name: "version", type: "integer", notNull: true },
            { name: "schema_json", type: "text", notNull: true },
            {
                name: "created_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
        ],
        primaryKey: ["schema_id", "version"],
    });
    await db.ensureTable({
        name: "study_library_content_packs",
        columns: [
            { name: "pack_id", type: "text", notNull: true },
            { name: "publisher", type: "text", notNull: true },
            { name: "version", type: "text", notNull: true },
            { name: "content_revision", type: "text", notNull: true },
            { name: "schema_id", type: "text", notNull: true },
            { name: "schema_version", type: "integer", notNull: true },
            { name: "digest", type: "text", notNull: true },
            { name: "record_count", type: "integer", notNull: true },
            { name: "relationship_count", type: "integer", notNull: true },
            {
                name: "metadata_json",
                type: "text",
                notNull: true,
                default: "{}",
            },
            {
                name: "installed_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
        ],
        primaryKey: ["publisher", "pack_id", "version"],
    });
    await db.ensureTable({
        name: "study_library_content_pack_assets",
        columns: [
            { name: "publisher", type: "text", notNull: true },
            { name: "pack_id", type: "text", notNull: true },
            { name: "version", type: "text", notNull: true },
            { name: "asset_path", type: "text", notNull: true },
            { name: "media_type", type: "text", notNull: true },
            { name: "data_base64", type: "text", notNull: true },
        ],
        primaryKey: ["publisher", "pack_id", "version", "asset_path"],
    });
    await db.ensureTable({
        name: "study_library_entries",
        columns: [
            { name: "id", type: "text", primaryKey: true },
            { name: "scope", type: "text", notNull: true },
            { name: "scope_id", type: "text", notNull: true },
            { name: "schema_id", type: "text", notNull: true },
            { name: "schema_version", type: "integer", notNull: true },
            { name: "layer", type: "text", notNull: true },
            { name: "language", type: "text", notNull: true },
            { name: "label", type: "text", notNull: true },
            { name: "class", type: "text" },
            {
                name: "tags_json",
                type: "text",
                notNull: true,
                default: "[]",
            },
            { name: "source_record_id", type: "text" },
            {
                name: "provider_modified",
                type: "boolean",
                notNull: true,
                default: false,
            },
            { name: "display_id", type: "integer" },
            {
                name: "hidden",
                type: "boolean",
                notNull: true,
                default: false,
            },
            {
                name: "always_show_definition",
                type: "boolean",
                notNull: true,
                default: false,
            },
            {
                name: "protected",
                type: "boolean",
                notNull: true,
                default: false,
            },
            {
                name: "editable",
                type: "boolean",
                notNull: true,
                default: true,
            },
            {
                name: "fields_json",
                type: "text",
                notNull: true,
                default: "{}",
            },
            { name: "content_hash", type: "text", unique: true },
            {
                name: "search_text",
                type: "text",
                notNull: true,
                default: "",
            },
            { name: "created_by", type: "text", notNull: true },
            {
                name: "created_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
            {
                name: "updated_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
        ],
    });
    await db.ensureTable({
        name: "study_library_content_hash_blacklist",
        columns: [
            { name: "content_hash", type: "text", primaryKey: true },
            { name: "deleted_by", type: "text", notNull: true },
            {
                name: "deleted_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
        ],
    });
    await db.ensureTable({
        name: "study_library_references",
        columns: [
            { name: "source_entry_id", type: "text", notNull: true },
            { name: "target_entry_id", type: "text", notNull: true },
            {
                name: "relation",
                type: "text",
                notNull: true,
                default: "contains",
            },
            {
                name: "position",
                type: "integer",
                notNull: true,
                default: 0,
            },
        ],
        primaryKey: [
            "source_entry_id",
            "target_entry_id",
            "relation",
            "position",
        ],
    });
    await ensurePushRequestSchema(db);
    await ensureEntryStateSchema(db);
}
