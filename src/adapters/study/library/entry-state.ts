import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type { LibraryLocation } from "./types.js";

export async function ensureEntryStateSchema(db: DbExecutor): Promise<void> {
    await db.ensureTable({
        name: "study_library_viewed_entries",
        columns: [
            { name: "account_id", type: "text", notNull: true },
            { name: "entry_id", type: "text", notNull: true },
            {
                name: "viewed_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
        ],
        primaryKey: ["account_id", "entry_id"],
    });
}

export async function viewedEntryIds(
    db: DbExecutor,
    accountId: string,
): Promise<string[]> {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "study_library_viewed_entries",
        where: [{ column: "account_id", value: accountId }],
    });
    return (result.rows ?? []).map((row) => String(row.entry_id));
}

export async function markEntriesViewed(
    db: DbExecutor,
    accountId: string,
    entryIds: readonly string[],
): Promise<void> {
    await db.transaction(async (transactionDb) => {
        for (const entryId of entryIds) {
            await transactionDb.executeCommand({
                option: "INSERT",
                table: "study_library_viewed_entries",
                values: {
                    account_id: accountId,
                    entry_id: entryId,
                    viewed_at: new Date().toISOString(),
                },
                conflict: {
                    action: "update",
                    target: ["account_id", "entry_id"],
                    update: { viewed_at: new Date().toISOString() },
                },
            });
        }
    });
}

export async function moveEntry(
    db: DbExecutor,
    id: string,
    destination: LibraryLocation,
): Promise<void> {
    await db.executeCommand({
        option: "UPDATE",
        table: "study_library_entries",
        set: {
            scope: destination.scope,
            scope_id: destination.scopeId ?? destination.scope,
            updated_at: new Date().toISOString(),
        },
        where: [{ column: "id", value: id }],
    });
}
