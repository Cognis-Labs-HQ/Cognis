import { randomBytes } from "node:crypto";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import {
    decryptPayload,
    deriveScopedKey,
    encryptPayload,
    getDataEncryptionKey,
} from "../../../../api/reuse/crypto.js";

export async function storeWrappedRoomKey(
    db: DbExecutor,
    roomId: string,
    plaintextKeyHex: string,
): Promise<void> {
    const secret = getDataEncryptionKey();
    const wrapper = await deriveScopedKey(
        `social:messages:room:${roomId}`,
        secret,
    );
    const { iv, ciphertext } = await encryptPayload(wrapper, plaintextKeyHex);
    await db.executeCommand({
        option: "INSERT",
        table: "chatroom_keys",
        values: {
            chatroom_id: roomId,
            wrapped_key: ciphertext,
            key_iv: iv,
        },
        conflict: { action: "update", target: ["chatroom_id"] },
    });
}

export async function getUnwrappedRoomKey(
    db: DbExecutor,
    roomId: string,
): Promise<string | null> {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "chatroom_keys",
        columns: ["wrapped_key", "key_iv"],
        where: [{ column: "chatroom_id", value: roomId }],
    });
    const row = result.rows?.[0];
    if (!row) {
        return null;
    }

    const secret = getDataEncryptionKey();
    const wrapper = await deriveScopedKey(
        `social:messages:room:${roomId}`,
        secret,
    );
    return decryptPayload(wrapper, String(row.key_iv), String(row.wrapped_key));
}

export async function generateAndStoreRoomKey(
    db: DbExecutor,
    roomId: string,
): Promise<string> {
    const plaintextHex = randomBytes(32).toString("hex");
    await storeWrappedRoomKey(db, roomId, plaintextHex);
    return plaintextHex;
}

export async function claimRoomKeyContribution(
    db: DbExecutor,
    roomId: string,
    accountId: string,
): Promise<string | null> {
    return db.transaction(async (executor) => {
        const membership = await executor.executeCommand({
            option: "SELECT",
            table: "chatroom_members",
            columns: ["key_delivered_at"],
            where: [
                { column: "chatroom_id", value: roomId },
                { column: "account_id", value: accountId },
            ],
        });
        if (!membership.rows?.[0] || membership.rows[0].key_delivered_at) {
            return null;
        }
        const roomKey =
            (await getUnwrappedRoomKey(executor, roomId)) ??
            (await generateAndStoreRoomKey(executor, roomId));
        return roomKey;
    });
}

export async function acknowledgeRoomKeyContribution(
    db: DbExecutor,
    roomId: string,
    accountId: string,
): Promise<void> {
    await db.transaction(async (executor) => {
        await executor.executeCommand({
            option: "UPDATE",
            table: "chatroom_members",
            set: { key_delivered_at: new Date().toISOString() },
            where: [
                { column: "chatroom_id", value: roomId },
                { column: "account_id", value: accountId },
                { column: "key_delivered_at", value: null },
            ],
        });
    });
}
