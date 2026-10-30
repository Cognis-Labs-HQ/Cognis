import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";
import { runOperation } from "../../reuse/operation.js";
import assert from "node:assert/strict";
import test from "node:test";
import { createLibraryFlow } from "../reuse/flows.js";
import { createRequestNotifier } from "../../request-notifications.js";
import type { LibraryPushRequest } from "../../types.js";

test("new requests notify all enabled administrators; decisions exclude the actor and isolate delivery failures", async () => {
    const deliveries: Array<Record<string, unknown>> = [];
    const failures: unknown[] = [];
    const flowRuns: string[] = [];
    const notify = createRequestNotifier({
        flow: createLibraryFlow((id) => flowRuns.push(id)),
        accounts: {
            list: async () => [
                {
                    accountId: "actor",
                    username: "public-actor",
                    role: "admin",
                    enabled: true,
                },
                {
                    accountId: "other",
                    username: "public-other",
                    role: "admin",
                    enabled: true,
                },
                {
                    accountId: "founder",
                    username: "public-founder",
                    isFounder: true,
                    enabled: true,
                },
                {
                    accountId: "disabled",
                    username: "public-disabled",
                    role: "admin",
                    enabled: false,
                },
                {
                    accountId: "learner",
                    username: "public-learner",
                    role: "user",
                    enabled: true,
                },
            ],
        },
        dispatch: async (input) => {
            deliveries.push(input);
            if (input.recipientUsername === "founder")
                throw new Error("offline");
        },
        log: (_level, _message, metadata) => failures.push(metadata),
    });
    for (const status of [
        "pending",
        "approved",
        "rejected",
        "withdrawn",
    ] as const) {
        await notify({ id: "request", status } as LibraryPushRequest, {
            accountId: "actor",
            role: "admin",
        });
    }
    assert.deepEqual(flowRuns, Array(4).fill("study:library:notifyRequest"));
    assert.equal(deliveries.length, 9);
    assert.equal(failures.length, 4);
    for (const input of deliveries) {
        assert.equal(input.category, "study");
        assert.equal(input.actionUrl, "/study/library/requests");
        const metadata = input.metadata as {
            localizedText: Record<string, { body: string }>;
        };
        assert.deepEqual(Object.keys(metadata.localizedText), [
            "en",
            "de",
            "ja",
            "id",
        ]);
        assert.match(metadata.localizedText.en.body, /actor/);
        assert.match(metadata.localizedText.en.body, /request/);
    }
});

test("request identifiers and actor text are interpolated once as data", async () => {
    const deliveries: Array<{ body: string }> = [];
    const actorId = "{{ request }} &amp;lt;admin&amp;gt;";
    const notify = createRequestNotifier({
        flow: createLibraryFlow(),
        accounts: {
            list: async () => [
                {
                    accountId: "recipient",
                    username: "public-recipient",
                    enabled: true,
                    role: "admin",
                },
            ],
        },
        dispatch: async (input) => {
            deliveries.push(input);
        },
    });
    await notify({ id: "request", status: "pending" } as LibraryPushRequest, {
        accountId: actorId,
        role: "user",
    });
    assert.equal(deliveries.length, 1);
    assert.ok(deliveries[0].body.includes(actorId));
});

test("notification catalogs coalesce reads and retry a failed resource load", async () => {
    const reads: string[] = [];
    const deliveries: unknown[] = [];
    const errors: unknown[] = [];
    let fail = true;
    const { createNotificationMessages } = loadTestModule<
        typeof import("../../reuse/notification-messages.js")
    >(
        new URL("../../reuse/notification-messages.ts", import.meta.url),
        {
            "node:fs/promises": {
                readFile: async (url: URL) => {
                    reads.push(url.pathname);
                    if (fail) {
                        fail = false;
                        throw new Error("resource_unavailable");
                    }
                    return '<resources><string name="adapter.study.library.notification_pending_subject">Subject</string><string name="adapter.study.library.notification_pending_body">{{ account }}</string></resources>';
                },
            },
        },
        { URL },
    );
    const { createRequestNotifier: createNotifier } = loadTestModule<
        typeof import("../../request-notifications.js")
    >(new URL("../../request-notifications.ts", import.meta.url), {
        "./reuse/notification-messages.js": { createNotificationMessages },
        "./reuse/operation.js": { runOperation },
    });
    const notify = createNotifier({
        flow: createLibraryFlow(),
        accounts: {
            list: async () => [
                {
                    accountId: "admin",
                    username: "public-admin",
                    enabled: true,
                    role: "admin",
                },
            ],
        },
        dispatch: async (input: unknown) => {
            deliveries.push(input);
        },
        log: (_level: string, _message: string, metadata: unknown) => {
            errors.push(metadata);
        },
    });
    const request = { id: "request", status: "pending" } as LibraryPushRequest;
    const actor = { accountId: "submitter", role: "user" as const };
    await notify(request, actor);
    assert.equal(errors.length, 1);
    assert.equal(deliveries.length, 0);
    await Promise.all([notify(request, actor), notify(request, actor)]);
    assert.equal(
        reads.length,
        5,
        "One failed read and one successful load for each of four locales",
    );
    assert.equal(deliveries.length, 2);
    await notify(request, actor);
    assert.equal(
        reads.length,
        5,
        "Repeated delivery reuses the owner-scoped catalogs",
    );
    assert.equal(deliveries.length, 3);
});
