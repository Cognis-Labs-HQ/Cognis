import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";

export interface ChatroomSourceInput {
    roomId: string;
    actorAccountId: string;
    sourceType: string;
    sourceId: string;
}

/** Compare-and-set prevents concurrent integrations from claiming the same room. */
export async function changeChatroomSource(
    db: DbExecutor,
    input: ChatroomSourceInput,
    release = false,
    administrator = false,
): Promise<void> {
    if (
        !input.roomId ||
        !input.actorAccountId ||
        !/^[a-z][a-z0-9:-]{0,99}$/.test(input.sourceType) ||
        !input.sourceId?.trim() ||
        input.sourceId.length > 200
    )
        throw new Error("Invalid chatroom source binding.");
    const select = () =>
        db.executeCommand({
            option: "SELECT",
            table: "chatrooms",
            columns: ["created_by", "source_type", "source_id"],
            where: [{ column: "id", value: input.roomId }],
        });
    const room = (await select()).rows?.[0];
    if (!room && release) return;
    if (!room) throw new Error("Chatroom not found.");
    const membership = await db.executeCommand({
        option: "SELECT",
        table: "chatroom_members",
        columns: ["account_id"],
        where: [
            { column: "chatroom_id", value: input.roomId },
            { column: "account_id", value: input.actorAccountId },
        ],
    });
    if (
        !(release && administrator) &&
        room.created_by !== input.actorAccountId &&
        !membership.rows?.length
    )
        throw new Error("Chatroom source access denied.");
    await db.executeCommand({
        option: "UPDATE",
        table: "chatrooms",
        set: {
            source_type: release ? null : input.sourceType,
            source_id: release ? null : input.sourceId,
        },
        where: [
            { column: "id", value: input.roomId },
            ...(release
                ? [
                      { column: "source_type", value: input.sourceType },
                      { column: "source_id", value: input.sourceId },
                  ]
                : [
                      { column: "source_type", operator: "IS NULL" as const },
                      { column: "source_id", operator: "IS NULL" as const },
                  ]),
        ],
    });
    if (release) return;
    const bound = (await select()).rows?.[0];
    if (
        bound?.source_type !== input.sourceType ||
        bound?.source_id !== input.sourceId
    )
        throw Object.assign(
            new Error("Chatroom is already bound to a different source."),
            { status: 409, code: "source_conflict" },
        );
}
