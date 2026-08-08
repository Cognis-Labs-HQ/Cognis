import assert from "node:assert/strict";
import test from "node:test";

import { submitClientMetrics } from "../ui/client.js";

test("client telemetry retries once when authentication changes in flight", async () => {
    let accessToken = "initial-token";
    globalThis.localStorage = {
        getItem: () => accessToken,
    };
    const authorizationHeaders = [];
    globalThis.fetch = async (_path, options) => {
        authorizationHeaders.push(options.headers.authorization);
        if (authorizationHeaders.length === 1) {
            accessToken = "replacement-token";
            return new Response(null, { status: 401 });
        }
        return new Response(null, { status: 204 });
    };

    const response = await submitClientMetrics({
        navigation: "spa",
        metrics: [{ name: "web.route_mount_ms", value: 12 }],
    });

    assert.equal(response.status, 204);
    assert.deepEqual(authorizationHeaders, [
        "Bearer initial-token",
        "Bearer replacement-token",
    ]);
});

test("client telemetry does not submit while signed out", async () => {
    globalThis.localStorage = { getItem: () => null };
    globalThis.fetch = () => {
        throw new Error("fetch should not be called");
    };

    assert.equal(
        await submitClientMetrics({ navigation: "spa", metrics: [] }),
        null,
    );
});
