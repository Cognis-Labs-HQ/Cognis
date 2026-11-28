import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import {
    usernameBase,
    usernameWithSuffix,
} from "../../../gateways/auth/reuse/usernames.js";

export async function readUsername(
    db: DbExecutor,
    accountId: string,
): Promise<string | null> {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "auth_account_names",
        columns: ["username"],
        where: [{ column: "account_id", value: accountId }],
        limit: 1,
    });
    return result.rows?.[0]?.username ? String(result.rows[0].username) : null;
}

/** Reserve before profile/email side effects; unique constraints also serialize racing claims. */
export async function reserveUsername(
    db: DbExecutor,
    accountId: string,
    provider: string,
    proposed: string,
): Promise<string> {
    const existing = await readUsername(db, accountId);
    if (existing) return existing;
    const base = usernameBase(proposed);
    const duplicate = await db.executeCommand({
        option: "SELECT",
        table: "auth_account_names",
        columns: ["account_id"],
        where: [
            { column: "provider", value: provider },
            { column: "provider_username", value: base },
        ],
        limit: 1,
    });
    if (duplicate.rows?.length) throw new Error("provider_username_taken");
    for (let attempt = 0; attempt < 32; attempt++) {
        const username = attempt === 0 ? base : usernameWithSuffix(base);
        await db.executeCommand({
            option: "INSERT",
            table: "auth_account_names",
            values: {
                account_id: accountId,
                username,
                provider,
                provider_username: base,
            },
            conflict: { action: "ignore", target: ["username"] },
        });
        const reserved = await readUsername(db, accountId);
        if (reserved) return reserved;
    }
    throw new Error("username_allocation_failed");
}

/** Explicitly repair existing provider-prefixed names without changing relationship keys. */
export async function prepareUsernames(db: DbExecutor): Promise<void> {
    await db.ensureTable({
        name: "auth_account_names",
        columns: [
            {
                name: "account_id",
                type: "text",
                primaryKey: true,
                references: {
                    table: "accounts",
                    column: "id",
                    onDelete: "CASCADE",
                },
            },
            { name: "username", type: "text", notNull: true },
            { name: "provider", type: "text", notNull: true },
            { name: "provider_username", type: "text", notNull: true },
        ],
        uniqueKeys: [["username"], ["provider", "provider_username"]],
    });
    const accounts = await db.executeCommand({
        option: "SELECT",
        table: "accounts",
        columns: ["id", "display_name"],
        orderBy: [
            { column: "created_at", direction: "ASC" },
            { column: "id", direction: "ASC" },
        ],
    });
    for (const account of accounts.rows ?? []) {
        const accountId = String(account.id);
        await db.transaction(async (tx) => {
            const identity = await tx.executeCommand({
                option: "SELECT",
                table: "auth_identities",
                columns: ["provider"],
                where: [{ column: "account_id", value: accountId }],
                limit: 1,
            });
            const username = await reserveUsername(
                tx,
                accountId,
                String(identity.rows?.[0]?.provider ?? "local"),
                accountId,
            );
            if (account.display_name === accountId)
                await tx.executeCommand({
                    option: "UPDATE",
                    table: "accounts",
                    set: { display_name: username },
                    where: [{ column: "id", value: accountId }],
                });
        });
    }
}
