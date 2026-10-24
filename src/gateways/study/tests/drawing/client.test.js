import * as offlineState from "../../../../ui/reuse/offline-state.js";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";

function clientFixture() {
    const requests = [];
    let successful = true;
    let finish;
    const pending = new Promise((resolve) => {
        finish = resolve;
    });
    const saved = { completed: true, hiddenStrokeCount: 1 };
    const environment = {
        apiFetch: async (path, options = {}) => {
            requests.push({ path, options });
            if (options.method === "POST") await pending;
            return { ok: successful, json: async () => ({ data: saved }) };
        },
    };
    environment.client = loadTestModule(
        new URL("../../ui/drawing-client.js", import.meta.url),
        {
            "/static/reuse/offline-state.js": offlineState,
            "/static/reuse/api-client.js": environment,
        },
        environment,
    );
    return {
        client: environment.client,
        requests,
        finish,
        saved,
        fail: () => {
            successful = false;
        },
    };
}

test("progress reads wait for in-flight completion on the same card", async () => {
    const { client, requests, finish, saved } = clientFixture();
    const completion = client.recordDrawingCompletion("card-a", {
        strokeCount: 4,
        mistakes: 0,
    });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].options.keepalive, true);
    assert.equal(requests[0].options.signal, undefined);
    const reopened = client.fetchDrawingProgress("card-a");
    await Promise.resolve();
    assert.equal(requests.length, 1);
    await client.fetchDrawingProgress("card-b");
    assert.equal(requests.length, 2);
    finish();
    assert.deepEqual(await completion, saved);
    assert.deepEqual(await reopened, saved);
    assert.equal(requests.length, 3);
});

test("a rejected completion fails waiting reads and releases later progress requests", async () => {
    const { client, requests, finish, fail } = clientFixture();
    const completion = client.recordDrawingCompletion("card-a", {
        strokeCount: 4,
        mistakes: 0,
    });
    const reading = client.fetchDrawingProgress("card-a");
    fail();
    finish();
    await assert.rejects(completion, /drawing_progress_failed/);
    await assert.rejects(reading, /drawing_progress_failed/);
    await assert.rejects(
        client.fetchDrawingProgress("card-a"),
        /drawing_progress_failed/,
    );
    assert.equal(requests.length, 2);
});
