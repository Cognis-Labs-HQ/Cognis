import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type { LibraryLocation, LibraryPushRequest } from "./types.js";

export async function ensurePushRequestSchema(db: DbExecutor): Promise<void> {
    await db.ensureTable({
        name: "study_library_push_requests",
        columns: [
            { name: "id", type: "text", primaryKey: true },
            { name: "source_entry_id", type: "text", notNull: true },
            { name: "destination_scope", type: "text", notNull: true },
            { name: "destination_scope_id", type: "text", notNull: true },
            { name: "requested_by", type: "text", notNull: true },
            { name: "status", type: "text", notNull: true, default: "pending" },
            { name: "reviewed_by", type: "text" },
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
): Promise<LibraryPushRequest> {
    const id = randomUUID();
    await db.executeCommand({
        option: "INSERT",
        table: "study_library_push_requests",
        values: {
            id,
            source_entry_id: sourceEntryId,
            destination_scope: destination.scope,
            destination_scope_id: destination.scopeId ?? destination.scope,
            requested_by: accountId,
        },
    });
    return {
        id,
        sourceEntryId,
        destination,
        requestedBy: accountId,
        status: "pending",
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
    return {
        id: String(row.id),
        sourceEntryId: String(row.source_entry_id),
        destination: {
            scope: String(row.destination_scope) as LibraryLocation["scope"],
            scopeId: String(row.destination_scope_id),
        },
        requestedBy: String(row.requested_by),
        status: String(row.status) as LibraryPushRequest["status"],
    };
}

export async function listPushRequests(
    db: DbExecutor,
    status: LibraryPushRequest["status"] = "pending",
): Promise<LibraryPushRequest[]> {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "study_library_push_requests",
        where: [{ column: "status", value: status }],
    });
    const requests = await Promise.all(
        (result.rows ?? []).map((row) => getPushRequest(db, String(row.id))),
    );
    return requests.filter(
        (request): request is LibraryPushRequest => request !== null,
    );
}

export async function reviewPushRequest(
    db: DbExecutor,
    id: string,
    status: "approved" | "rejected",
    reviewerId: string,
): Promise<void> {
    await db.executeCommand({
        option: "UPDATE",
        table: "study_library_push_requests",
        values: {
            status,
            reviewed_by: reviewerId,
            updated_at: new Date().toISOString(),
        },
        where: [
            { column: "id", value: id },
            { column: "status", value: "pending" },
        ],
    });
}
