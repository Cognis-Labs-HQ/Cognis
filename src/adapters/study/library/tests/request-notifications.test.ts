import assert from "node:assert/strict";
import test from "node:test";
import { createLibraryFlow } from "./reuse/flows.js";
import { createRequestNotifier } from "../request-notifications.js";
import type { LibraryPushRequest } from "../types.js";

test("new requests notify all enabled administrators; decisions exclude the actor and isolate delivery failures", async () => {
    const deliveries: Array<Record<string, unknown>> = [];
    const failures: unknown[] = [];
    const flowRuns: string[] = [];
    const notify = createRequestNotifier({
        flow: createLibraryFlow((id) => flowRuns.push(id)),
        accounts: {
            list: async () => [
                { username: "actor", role: "admin", enabled: true },
                { username: "other", role: "admin", enabled: true },
                { username: "founder", isFounder: true, enabled: true },
                { username: "disabled", role: "admin", enabled: false },
                { username: "learner", role: "user", enabled: true },
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
