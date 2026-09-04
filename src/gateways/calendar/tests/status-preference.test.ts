import test from "node:test";
import assert from "node:assert/strict";
import { issueAccessToken } from "../../auth/access-tokens.js";
import { createStatusPreferenceRoutes } from "../bootstrap/status-preference/index.js";

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

test("calendar status preference is authenticated and persisted", async () => {
    let storedPreference = "false";
    const route = createStatusPreferenceRoutes({
        getPreference: async () => storedPreference,
        setPreference: async (accountId, prevented) => {
            assert.equal(accountId, "alice");
            storedPreference = String(prevented);
            return true;
        },
    });
    const saved = responseCapture();
    await route(
        request("PUT", JSON.stringify({ prevented: true })),
        saved.response,
        new URL("http://localhost/api/v1/calendar/status-preference"),
    );
    assert.equal(saved.capture.status, 200);

    const loaded = responseCapture();
    await route(
        request("GET"),
        loaded.response,
        new URL("http://localhost/api/v1/calendar/status-preference"),
    );
    assert.deepEqual(JSON.parse(loaded.capture.body).data, { prevented: true });
});

test("calendar status preference rejects non-boolean values", async () => {
    const route = createStatusPreferenceRoutes({
        getPreference: async () => null,
        setPreference: async () => true,
    });
    const result = responseCapture();
    await route(
        request("PUT", JSON.stringify({ prevented: "yes" })),
        result.response,
        new URL("http://localhost/api/v1/calendar/status-preference"),
    );
    assert.equal(result.capture.status, 400);
    assert.equal(
        JSON.parse(result.capture.body).error.code,
        "invalid_preference",
    );
});

test("calendar status preference reports unavailable storage", async () => {
    const route = createStatusPreferenceRoutes({
        getPreference: async () => null,
        setPreference: async () => false,
    });
    const result = responseCapture();
    await route(
        request("PUT", JSON.stringify({ prevented: true })),
        result.response,
        new URL("http://localhost/api/v1/calendar/status-preference"),
    );
    assert.equal(result.capture.status, 503);
    assert.equal(
        JSON.parse(result.capture.body).error.code,
        "preferences_unavailable",
    );
});
