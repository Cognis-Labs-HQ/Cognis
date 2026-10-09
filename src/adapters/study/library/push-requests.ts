import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type {
    LibraryEntry,
    LibraryLocation,
    LibraryPushRequest,
} from "./types.js";

export async function ensurePushRequestSchema(db: DbExecutor): Promise<void> {
    await db.ensureTable({
        name: "study_library_pending_requests",
        columns: [
            { name: "source_entry_id", type: "text", primaryKey: true },
            { name: "request_id", type: "text", notNull: true, unique: true },
        ],
    });
    await db.ensureTable({
        name: "study_library_push_requests",
        indexes: [{ columns: ["status"] }],
        columns: [
            { name: "id", type: "text", primaryKey: true },
            { name: "source_entry_id", type: "text", notNull: true },
            { name: "destination_scope", type: "text", notNull: true },
            { name: "destination_scope_id", type: "text", notNull: true },
            { name: "requested_by", type: "text", notNull: true },
            { name: "status", type: "text", notNull: true, default: "pending" },
            { name: "reviewed_by", type: "text" },
            {
                name: "request_kind",
                type: "text",
                notNull: true,
                default: "promotion",
            },
            { name: "proposed_entry_json", type: "text" },
            { name: "source_entry_json", type: "text" },
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
}

export async function createPushRequest(
    db: DbExecutor,
    sourceEntryId: string,
    destination: LibraryLocation,
    accountId: string,
    kind: "promotion" | "update" | "merge" = "promotion",
    proposedEntry?: LibraryPushRequest["proposedEntry"],
    sourceSnapshot?: LibraryEntry,
): Promise<LibraryPushRequest> {
    const id = randomUUID();
    await db.executeCommand({
        option: "INSERT",
        table: "study_library_pending_requests",
        values: { source_entry_id: sourceEntryId, request_id: id },
    });
    await db.executeCommand({
        option: "INSERT",
        table: "study_library_push_requests",
        values: {
            id,
            source_entry_id: sourceEntryId,
            destination_scope: destination.scope,
            destination_scope_id: destination.scopeId ?? destination.scope,
            requested_by: accountId,
            request_kind: kind,
            proposed_entry_json: proposedEntry
                ? JSON.stringify(proposedEntry)
                : null,
            source_entry_json: sourceSnapshot
                ? JSON.stringify(sourceSnapshot)
                : null,
        },
    });
    return {
        id,
        sourceEntryId,
        destination,
        requestedBy: accountId,
        status: "pending",
        kind,
        proposedEntry,
        sourceSnapshot,
    };
}

export async function getPushRequest(
    db: DbExecutor,
    id: string,
): Promise<LibraryPushRequest | null> {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "study_library_push_requests",
        where: [{ column: "id", value: id }],
    });
    const row = result.rows?.[0];
    if (!row) return null;
    return mapPushRequest(row);
}

function mapPushRequest(row: Record<string, unknown>): LibraryPushRequest {
    return {
        id: String(row.id),
        sourceEntryId: String(row.source_entry_id),
        destination: {
            scope: String(row.destination_scope) as LibraryLocation["scope"],
            scopeId: String(row.destination_scope_id),
        },
        requestedBy: String(row.requested_by),
        status: String(row.status) as LibraryPushRequest["status"],
        kind: ["update", "merge"].includes(
            String(row.request_kind ?? "promotion"),
        )
            ? (String(row.request_kind) as "update" | "merge")
            : "promotion",
        proposedEntry: row.proposed_entry_json
            ? (JSON.parse(
                  String(row.proposed_entry_json),
              ) as LibraryPushRequest["proposedEntry"])
            : undefined,
        sourceSnapshot: row.source_entry_json
            ? JSON.parse(String(row.source_entry_json))
            : undefined,
        requestedAt: String(row.created_at),
        reviewedAt: row.reviewed_by ? String(row.updated_at) : undefined,
        reviewedBy: row.reviewed_by ? String(row.reviewed_by) : undefined,
    };
}

export async function listPushRequests(
    db: DbExecutor,
    status?: LibraryPushRequest["status"],
): Promise<LibraryPushRequest[]> {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "study_library_push_requests",
        ...(status ? { where: [{ column: "status", value: status }] } : {}),
    });
    return (result.rows ?? []).map(mapPushRequest);
}

export async function reviewPushRequest(
    db: DbExecutor,
    id: string,
    status: "approved" | "rejected" | "withdrawn",
    reviewerId: string,
): Promise<void> {
    const result = await db.executeCommand({
        option: "UPDATE",
        table: "study_library_push_requests",
        set: {
            status,
            reviewed_by: reviewerId,
            updated_at: new Date().toISOString(),
        },
        where: [
            { column: "id", value: id },
            { column: "status", value: "pending" },
        ],
    });
    if (result.rowCount !== 1) throw new Error("already_reviewed");
    await db.executeCommand({
        option: "DELETE",
        table: "study_library_pending_requests",
        where: [{ column: "request_id", value: id }],
    });
}
