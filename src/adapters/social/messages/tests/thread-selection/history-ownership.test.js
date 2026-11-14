import test from "node:test";
import assert from "node:assert/strict";
import {
    createRenderer,
    createLoadedHistory,
    message,
    select,
} from "./fixture.js";
import { deferred, until } from "../async-state/fixture.js";

function active(state) {
    return Boolean(
        state.container.querySelector(
            '[data-message-id="message-5"] .messages-reaction-chip--active',
        ),
    );
}

for (const firstToComplete of ["older", "newer"]) {
    test(`historical true-to-false reactions retain newer acknowledgement when ${firstToComplete} read completes first`, async (context) => {
        const state = await createLoadedHistory(context);
        const body = state.body("message-5");
        const snapshot = select(
            state.document,
            body.querySelector("strong").firstChild,
        );
        const gates = [deferred(), deferred()];
        let reads = 0;
        state.decrypt = async (_key, record) => {
            if (record.id === "message-5") await gates[reads++].promise;
            return record.ciphertext;
        };
        const older = state.actions.toggleReaction("message-5", "♥");
        await until(() => reads === 1);
        const newer = state.actions.toggleReaction("message-5", "♥");
        await until(() => reads === 2);
        assert.equal(active(state), false);
        const requests = [older, newer];
        const first = firstToComplete === "older" ? 0 : 1;
        gates[first].resolve();
        await requests[first];
        assert.equal(active(state), false);
        gates[1 - first].resolve();
        await requests[1 - first];
        assert.equal(active(state), false);
        assert.equal(state.body("message-5"), body);
        assert.equal(snapshot.selection.toString(), snapshot.text);
        assert.deepEqual(
            state.requests
                .filter(({ method }) => method === "POST")
                .map(({ body }) => JSON.parse(body).active),
            [true, false],
        );
        assert.equal(state.errors.length, 0);
    });
}

test("older history cannot resurrect rows excluded by a newer complete latest page", async (context) => {
    const state = await createLoadedHistory(context);
    const gate = deferred();
    let reached = false;
    state.decrypt = async (_key, record) => {
        if (record.id === "message-0") {
            reached = true;
            await gate.promise;
        }
        return record.ciphertext;
    };
    const pending = state.render({ before: message("boundary", 50).createdAt });
    await until(() => reached);
    state.decrypt = async (_key, record) => record.ciphertext;
    state.messages = state.messages.slice(80);
    await state.render();
    const body = state.body("message-99");
    const snapshot = select(
        state.document,
        body.querySelector("strong").firstChild,
    );
    gate.resolve();
    await pending;
    assert.equal(state.body("message-0"), null);
    assert.equal(
        state.container.querySelectorAll(".messages-message-row").length,
        20,
    );
    assert.equal(
        state.container.querySelector(".messages-load-earlier-btn"),
        null,
    );
    assert.equal(state.body("message-99"), body);
    assert.equal(snapshot.selection.toString(), snapshot.text);
    await state.render();
    assert.equal((await state.render()).changed, false);
});

test("a retained newer acknowledgement invalidates an older raw latest signature", async (context) => {
    const state = await createLoadedHistory(context);
    const gate = deferred();
    let reached = false;
    state.decrypt = async (_key, record) => {
        if (record.id === "message-99") {
            reached = true;
            await gate.promise;
        }
        return record.ciphertext;
    };
    const pending = state.render({ force: true });
    await until(() => reached);
    state.decrypt = async (_key, record) => record.ciphertext;
    state.intercept = async (path, options) =>
        path.includes("?limit=50") && options.method !== "POST"
            ? Response.json({}, { status: 503 })
            : null;
    await state.actions.toggleReaction("message-99", "♥");
    assert.equal(state.errors.length, 2);
    gate.resolve();
    await pending;
    const body = state.body("message-99");
    const snapshot = select(
        state.document,
        body.querySelector("strong").firstChild,
    );
    assert.ok(
        body
            .closest("[data-message-id]")
            .querySelector(".messages-reaction-chip--active"),
    );
    state.intercept = async () => null;
    state.messages[99].reactions = [];
    state.offline.invalidateCache();
    assert.equal((await state.render()).changed, true);
    assert.equal(
        state.container.querySelector(".messages-reaction-chip--active"),
        null,
    );
    assert.equal((await state.render()).changed, false);
    assert.equal(state.body("message-99"), body);
    assert.equal(snapshot.selection.toString(), snapshot.text);
});

test("an older same-signature completion cannot lower latest publication ownership", async (context) => {
    const state = createRenderer();
    context.after(state.dispose);
    state.messages = [message("message-99", 99)];
    await state.render();
    const firstGate = deferred();
    let firstReached = false;
    state.intercept = async () => {
        firstReached = true;
        await firstGate.promise;
        return Response.json({
            data: state.messages.slice(-50),
            pendingRequest: state.pendingRequest,
        });
    };
    const first = state.render();
    await until(() => firstReached);
    state.offline.invalidateCache();
    state.messages = Array.from({ length: 100 }, (_, index) =>
        message(`message-${index}`, index),
    );
    state.intercept = async () => null;
    const middleGate = deferred();
    let middleReached = false;
    state.decrypt = async (_key, record) => {
        if (record.id === "message-99") {
            middleReached = true;
            await middleGate.promise;
        }
        return record.ciphertext;
    };
    state.pendingRequest = { id: "older" };
    const middle = state.render();
    await until(() => middleReached);
    state.decrypt = async (_key, record) => record.ciphertext;
    state.messages.push(message("message-100", 100));
    state.pendingRequest = { id: "newer" };
    await state.render();
    const body = state.body("message-99");
    const snapshot = select(
        state.document,
        body.querySelector("strong").firstChild,
    );
    firstGate.resolve();
    assert.equal((await first).changed, false);
    middleGate.resolve();
    const result = await middle;
    assert.equal(result.changed, false);
    assert.equal(result.pendingRequest.id, "newer");
    assert.equal(state.body("message-50"), null);
    assert.equal(
        state.container.querySelectorAll(".messages-message-row").length,
        50,
    );
    assert.equal(state.body("message-99"), body);
    assert.equal(snapshot.selection.toString(), snapshot.text);
});

test("newer live historical rows keep pagination when an older short latest page finishes", async (context) => {
    const state = createRenderer();
    context.after(state.dispose);
    const all = Array.from({ length: 100 }, (_, index) =>
        message(`message-${index}`, index),
    );
    state.messages = all.slice(80);
    await state.render();
    const gate = deferred();
    let reached = false;
    state.decrypt = async (_key, record) => {
        if (record.id === "message-99") {
            reached = true;
            await gate.promise;
        }
        return record.ciphertext;
    };
    const pending = state.render({ force: true });
    await until(() => reached);
    state.decrypt = async (_key, record) => record.ciphertext;
    state.messages = all;
    await state.render({ before: all[80].createdAt });
    const body = state.body("message-50");
    const snapshot = select(
        state.document,
        body.querySelector("strong").firstChild,
    );
    gate.resolve();
    await pending;
    assert.equal(
        state.container.querySelectorAll(".messages-message-row").length,
        70,
    );
    assert.ok(state.container.querySelector(".messages-load-earlier-btn"));
    assert.equal(state.body("message-50"), body);
    assert.equal(snapshot.selection.toString(), snapshot.text);
});
