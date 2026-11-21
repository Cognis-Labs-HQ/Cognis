import test from "node:test";
import assert from "node:assert/strict";
import {
    createRenderer,
    createLoadedHistory,
    message,
    select,
} from "./fixture.js";
import { deferred, until } from "../async-state/fixture.js";

const path = "/api/v1/social/messages/rooms/room/messages";
const active = (state, id) =>
    Boolean(
        state
            .body(id)
            ?.closest("[data-message-id]")
            .querySelector(".messages-reaction-chip--active"),
    );

for (const fallback of [false, true]) {
    test(`${fallback ? "mid-request fallback" : "cached short latest page"} preserves newer loaded history and selection`, async (context) => {
        const state = createRenderer();
        context.after(state.dispose);
        const all = Array.from({ length: 100 }, (_, index) =>
            message(`message-${index}`, index),
        );
        state.messages = all.slice(80);
        await state.render();
        state.messages = all;
        await state.render({ before: all[80].createdAt });
        const body = state.body("message-50");
        const snapshot = select(
            state.document,
            body.querySelector("strong").firstChild,
        );
        let pending;
        const gate = deferred();
        let reached = false;
        if (fallback) {
            state.intercept = async (requestPath) => {
                if (requestPath === path + "?limit=50") {
                    reached = true;
                    await gate.promise;
                    throw new TypeError("disconnect");
                }
                return null;
            };
            pending = state.render();
            await until(() => reached);
        }
        state.offline.disconnect();
        await state.client.messagesFetch(path, {
            method: "POST",
            body: JSON.stringify({
                ciphertext: "Queued body",
                iv: "synthetic",
            }),
        });
        if (fallback) {
            gate.resolve();
            await pending;
        } else await state.render();
        assert.equal(
            state.container.querySelectorAll(".messages-message-row").length,
            71,
        );
        assert.equal(state.body("message-50"), body);
        assert.equal(snapshot.selection.toString(), snapshot.text);
        assert.ok(state.container.querySelector(".messages-load-earlier-btn"));
        assert.equal((await state.render()).changed, false);
    });
}

test("cached history cannot undo an acknowledged reaction after a failed refresh", async (context) => {
    const state = await createLoadedHistory(context);
    state.intercept = async (requestPath, options) =>
        requestPath.includes("before=") && options.method !== "POST"
            ? Response.json({}, { status: 503 })
            : null;
    await state.actions.toggleReaction("message-5", "♥");
    assert.equal(active(state, "message-5"), true);
    state.offline.disconnect();
    await state.render({ before: message("boundary", 50).createdAt });
    assert.equal(active(state, "message-5"), true);
});

test("cached-only remounts can add absent earlier cached rows without live deletion authority", async (context) => {
    const state = await createLoadedHistory(context);
    state.container.replaceChildren();
    state.offline.disconnect();
    await state.render();
    const body = state.body("message-55");
    const snapshot = select(
        state.document,
        body.querySelector("strong").firstChild,
    );
    await state.render({ before: message("boundary", 50).createdAt });
    assert.equal(
        state.container.querySelectorAll(".messages-message-row").length,
        100,
    );
    assert.equal(state.body("message-55"), body);
    assert.equal(snapshot.selection.toString(), snapshot.text);
});

test("cached earlier rows do not refill history excluded by a live complete page", async (context) => {
    const state = await createLoadedHistory(context);
    state.messages = state.messages.slice(80);
    await state.render();
    state.offline.disconnect();
    await state.render({ before: message("boundary", 50).createdAt });
    assert.equal(
        state.container.querySelectorAll(".messages-message-row").length,
        20,
    );
    assert.equal(state.body("message-5"), null);
    assert.equal(
        state.container.querySelector(".messages-load-earlier-btn"),
        null,
    );
});

test("an identical later live payload reconciles metadata retained during cached reads", async (context) => {
    const state = await createLoadedHistory(context);
    state.intercept = async (requestPath, options) =>
        requestPath.includes("?limit=50") && options.method !== "POST"
            ? Response.json({}, { status: 503 })
            : null;
    await state.actions.toggleReaction("message-99", "♥");
    assert.equal(active(state, "message-99"), true);
    state.intercept = async () => null;
    state.offline.disconnect();
    await state.render();
    assert.equal(active(state, "message-99"), true);
    assert.equal((await state.render()).changed, false);
    state.messages[99].reactions = [];
    state.offline.reconnect();
    assert.equal((await state.render()).changed, true);
    assert.equal(active(state, "message-99"), false);
    assert.equal((await state.render()).changed, false);
});

test("a shared pre-acknowledgement transport cannot undo its subscriber's reaction", async (context) => {
    const state = createRenderer();
    context.after(state.dispose);
    state.messages = [message("latest")];
    await state.render();
    const gate = deferred();
    let reached = false;
    state.intercept = async (requestPath, options) => {
        if (requestPath.includes("?limit=50") && options.method !== "POST") {
            const payload = structuredClone({ data: state.messages });
            const response = Response.json(payload);
            response.json = async () => {
                reached = true;
                await gate.promise;
                return payload;
            };
            return response;
        }
        return null;
    };
    const pending = state.render({ force: true });
    await until(() => reached);
    const action = state.actions.toggleReaction("latest", "♥");
    await until(() => active(state, "latest"));
    await new Promise(setImmediate);
    const body = state.body("latest");
    const snapshot = select(
        state.document,
        body.querySelector("strong").firstChild,
    );
    gate.resolve();
    await Promise.all([pending, action]);
    assert.equal(active(state, "latest"), true);
    assert.equal(state.messages[0].reactions[0].reactedByMe, true);
    assert.equal(
        state.requests.filter(({ method }) => method !== "POST").length,
        2,
    );
    assert.equal(
        state.requests.filter(({ method }) => method === "POST").length,
        1,
    );
    assert.equal(state.errors.length, 0);
    assert.equal(state.body("latest"), body);
    assert.equal(snapshot.selection.toString(), snapshot.text);
    state.intercept = async () => null;
    state.messages[0].reactions = [];
    assert.equal((await state.render()).changed, true);
    assert.equal(active(state, "latest"), false);
    assert.equal((await state.render()).changed, false);
    assert.equal(snapshot.selection.toString(), snapshot.text);
});

test("a live page can reopen history after an empty cached prefix", async (context) => {
    const state = await createLoadedHistory(context);
    const before = message("boundary").createdAt;
    await state.client.messagesFetch(
        path + "?limit=50&before=" + encodeURIComponent(before),
    );
    state.offline.disconnect();
    await state.render({ before });
    assert.equal(
        state.container.querySelector(".messages-load-earlier-btn"),
        null,
    );
    state.offline.reconnect();
    await state.render();
    assert.ok(state.container.querySelector(".messages-load-earlier-btn"));
});

test("a retained acknowledgement does not reopen a complete live page to cached deletions", async (context) => {
    const state = await createLoadedHistory(context);
    state.messages = state.messages.slice(80);
    const gate = deferred();
    let reached = false;
    state.decrypt = async (_key, record) => {
        if (record.id === "message-99") {
            reached = true;
            await gate.promise;
        }
        return record.ciphertext;
    };
    const pending = state.render();
    await until(() => reached);
    state.decrypt = async (_key, record) => record.ciphertext;
    state.intercept = async (requestPath, options) =>
        requestPath.includes("?limit=50") && options.method !== "POST"
            ? Response.json({}, { status: 503 })
            : null;
    await state.actions.toggleReaction("message-99", "♥");
    gate.resolve();
    await pending;
    const body = state.body("message-99");
    const snapshot = select(
        state.document,
        body.querySelector("strong").firstChild,
    );
    state.offline.disconnect();
    await state.render({ before: message("boundary", 50).createdAt });
    assert.equal(
        state.container.querySelectorAll(".messages-message-row").length,
        20,
    );
    assert.equal(
        state.container.querySelector(".messages-load-earlier-btn"),
        null,
    );
    assert.equal(active(state, "message-99"), true);
    assert.equal(state.body("message-99"), body);
    assert.equal(snapshot.selection.toString(), snapshot.text);
});
