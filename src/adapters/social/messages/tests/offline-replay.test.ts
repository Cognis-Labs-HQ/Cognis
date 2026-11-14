import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createCtx, CTX_CAPABILITY } from "@cognis/core";
import { bootstrapSocialAdapter } from "../index.js";
import { DbMessagesStore } from "../store.js";
import { InMemoryTestExecutor } from "../../../../gateways/db/tests/in-memory-test-executor.js";
import { issueAccessToken } from "../../../../gateways/auth/access-tokens.js";
import type { SocialAdapterBootstrapCtx } from "../../../../gateways/social/gateway.js";

test("registered messaging flows replay one encrypted message without duplicate notification", async () => {
    const runtime = createCtx();
    const database = new InMemoryTestExecutor();
    const notifications: unknown[] = [];
    const routes: Array<
        (
            request: IncomingMessage,
            response: ServerResponse,
            url: URL,
        ) => Promise<boolean>
    > = [];
    const profile = (accountId: string) => ({
        accountId,
        handle: accountId,
        role: "user",
        visibility: "community",
        lifecycleState: "active",
    });
    const capabilities = new Map<string, unknown>([
        [CTX_CAPABILITY, runtime],
        ["db:executor", database],
        [
            "social:profileStore",
            {
                getProfile: async (accountId: string) => profile(accountId),
                isBlocked: async () => false,
                isFollowing: async () => true,
            },
        ],
        [
            "notify:dispatch",
            async (input: unknown) => {
                notifications.push(input);
                return { dispatched: [] };
            },
        ],
    ]);
    const context = {
        capabilities: {
            get: (id: string) => capabilities.get(id),
            contribute: (id: string, value: unknown) =>
                capabilities.set(id, value),
        },
        flow: runtime.flow,
        registerRoute: (route: (typeof routes)[number]) => routes.push(route),
        registerNavbarPlugin: () => {},
        isAdapterEnabled: () => true,
        isGatewayEnabled: () => true,
    } as unknown as SocialAdapterBootstrapCtx;
    await bootstrapSocialAdapter(context);
    const store = new DbMessagesStore(database);
    const room = await store.createRoom("group", "Conversation", "alice");
    await store.addMember(room.id, "alice", "owner");
    await store.addMember(room.id, "bob", "member");
    const input = {
        operationId: randomUUID(),
        ciphertext: "encrypted-content",
        iv: "encrypted-iv",
    };
    async function send(
        body: Record<string, unknown> = input,
        account = "alice",
        action = "messages",
    ) {
        const request = Readable.from([
            Buffer.from(JSON.stringify(body)),
        ]) as IncomingMessage;
        request.method = "POST";
        request.headers = {
            authorization: `Bearer ${issueAccessToken(account, "user", 60)}`,
        };
        let status = 0;
        let payload = "";
        const response = {
            writeHead(value: number) {
                status = value;
            },
            end(value: string) {
                payload = value;
            },
        } as unknown as ServerResponse;
        const url = new URL(
            `http://localhost/api/v1/social/messages/rooms/${room.id}/${action}`,
        );
        for (const route of routes)
            if (await route(request, response, url)) break;
        return { status, body: JSON.parse(payload) };
    }
    const first = await send();
    assert.equal(first.status, 201);
    assert.equal((await send()).body.data.id, first.body.data.id);
    assert.equal((await store.listMessages(room.id, 50)).length, 1);
    assert.equal(notifications.length, 1);
    assert.equal((await send({ ...input, ciphertext: "changed" })).status, 409);
    assert.equal((await send(input, "outsider")).status, 403);
    assert.equal(
        (await store.listMessages(room.id, 50))[0].ciphertext,
        input.ciphertext,
    );
    const reaction = `messages/${first.body.data.id}/reactions`;
    assert.equal(
        (await send({ emoji: "👍", active: true }, "bob", reaction)).body.data
            .active,
        true,
    );
    assert.equal(
        (await send({ emoji: "👍", active: true }, "bob", reaction)).body.data
            .active,
        true,
    );
    assert.equal(
        notifications.length,
        2,
        "an acknowledged reaction is not notified again on replay",
    );
    assert.equal(
        (await send({ emoji: "👍", active: "invalid" }, "bob", reaction))
            .status,
        400,
    );
    await send({ emoji: "👍", active: false }, "bob", reaction);
    await send({ emoji: "👍", active: false }, "bob", reaction);
    assert.equal((await store.listMessageReactions(room.id)).length, 0);
});
