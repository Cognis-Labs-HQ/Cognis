import assert from "node:assert/strict";
import test from "node:test";
import { createGroupChatResolver } from "../group-chat-resolution.js";

test("distinct group requests bypass participant reuse and initialize their own keys and members", async () => {
    const events = [];
    let sequence = 0;
    const resolve = createGroupChatResolver(
        {
            async findGroupByExactMembers() {
                events.push("lookup");
                return { id: "existing" };
            },
            async createRoom(kind, title, owner) {
                events.push([kind, title, owner]);
                return { id: `room-${++sequence}` };
            },
            async generateAndStoreRoomKey(id) {
                events.push(["key", id]);
            },
        },
        {
            async getProfileByHandle(handle) {
                return { accountId: handle };
            },
        },
        {
            async add(input) {
                events.push(["member", input.roomId, input.userAccountId]);
            },
        },
    );
    const input = {
        usernames: ["alice", "bob"],
        createdByAccountId: "alice",
        title: "Meeting",
    };
    assert.equal((await resolve(input)).roomId, "existing");
    assert.equal(
        (await resolve({ ...input, reuseExisting: false })).roomId,
        "room-1",
    );
    assert.equal(
        (await resolve({ ...input, reuseExisting: false })).roomId,
        "room-2",
    );
    assert.equal(events.filter((event) => event === "lookup").length, 1);
    assert.deepEqual(
        events.filter((event) => event[0] === "key"),
        [
            ["key", "room-1"],
            ["key", "room-2"],
        ],
    );
    assert.equal(events.filter((event) => event[0] === "member").length, 4);
});

test("a saved room is retained after membership changes and a deleted room is replaced", async () => {
    let created = 0;
    const resolve = createGroupChatResolver(
        {
            async getRoom(id) {
                return id === "saved" ? { id } : null;
            },
            async findGroupByExactMembers() {
                throw new Error(
                    "Existing meeting identity must not depend on members",
                );
            },
            async createRoom() {
                return { id: `new-${++created}` };
            },
            async generateAndStoreRoomKey() {},
        },
        {
            async getProfileByHandle(handle) {
                return { accountId: handle };
            },
        },
        { async add() {} },
    );
    const input = {
        usernames: ["alice", "new-participant"],
        createdByAccountId: "alice",
        reuseExisting: false,
    };
    assert.equal(
        (await resolve({ ...input, roomId: "saved" })).roomId,
        "saved",
    );
    assert.equal(created, 0);
    assert.equal(
        (await resolve({ ...input, roomId: "deleted" })).roomId,
        "new-1",
    );
    assert.equal(created, 1);
});

test("failed key or membership setup cannot claim a source, and a retry creates a complete room", async () => {
    for (const failAt of ["key", "member", "source"]) {
        const events = [];
        let failure = true;
        let sequence = 0;
        const resolve = createGroupChatResolver(
            {
                createRoom: async () => ({ id: `room-${++sequence}` }),
                generateAndStoreRoomKey: async () => {
                    events.push("key");
                    if (failure && failAt === "key")
                        throw new Error("setup_failed");
                },
                bindSource: async () => {
                    events.push("source");
                    if (failure && failAt === "source")
                        throw new Error("setup_failed");
                },
                deleteRoom: async (id) => events.push(`delete:${id}`),
            },
            { getProfileByHandle: async (id) => ({ accountId: id }) },
            {
                add: async () => {
                    events.push("member");
                    if (failure && failAt === "member")
                        throw new Error("setup_failed");
                },
            },
        );
        const input = {
            usernames: ["alice", "bob"],
            createdByAccountId: "alice",
            reuseExisting: false,
            source: { sourceType: "fixture", sourceId: "source" },
        };
        await assert.rejects(resolve(input), /setup_failed/);
        assert.equal(events.at(-1), "delete:room-1");
        if (failAt !== "source") assert.ok(!events.includes("source"));
        failure = false;
        events.length = 0;
        assert.equal((await resolve(input)).roomId, "room-2");
        assert.deepEqual(events, ["key", "member", "member", "source"]);
    }
});
