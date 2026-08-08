import test from "node:test";
import assert from "node:assert/strict";
import { issueAccessToken } from "../../../../../gateways/auth/access-tokens.js";
import { VolatileUserPreferenceStore } from "../preferences.js";
import { createAvailabilityRoutes } from "../availability.js";

const profile = {
    accountId: "alice",
    handle: "alice",
    displayName: "Alice",
};

function request(method: string, body?: string) {
    return {
        method,
        headers: {
            authorization: `Bearer ${issueAccessToken("alice", "user", 60)}`,
        },
        [Symbol.asyncIterator]: async function* () {
            if (body) yield Buffer.from(body);
        },
    } as any;
}

function responseCapture() {
    const capture = { status: 0, body: "" };
    return {
        capture,
        response: {
            writeHead(status: number) {
                capture.status = status;
            },
            end(body: string) {
                capture.body = body;
            },
        } as any,
    };
}

test("manual availability overrides an active calendar event", async () => {
    const preferences = new VolatileUserPreferenceStore();
    const profileStore = {
        getProfile: async () => profile,
        getProfileByHandle: async () => profile,
    } as any;
    const route = createAvailabilityRoutes(
        profileStore,
        preferences,
        async () => "tentative",
    );

    const saved = responseCapture();
    await route(
        request("PUT", JSON.stringify({ status: "busy" })),
        saved.response,
        new URL("http://localhost/api/v1/social/availability"),
    );
    assert.equal(saved.capture.status, 200);

    const loaded = responseCapture();
    await route(
        request("GET"),
        loaded.response,
        new URL("http://localhost/api/v1/social/availability/alice"),
    );
    const payload = JSON.parse(loaded.capture.body);
    assert.equal(payload.data.status, "busy");
    assert.equal(payload.data.manualStatus, "busy");
    assert.equal(payload.data.source, "manual");
});
