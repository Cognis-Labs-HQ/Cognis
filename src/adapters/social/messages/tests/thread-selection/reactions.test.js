import test from "node:test";
import assert from "node:assert/strict";
import {
    createRenderer,
    message,
    select,
    createLoadedHistory as history,
} from "./fixture.js";
import { deferred, until } from "../async-state/fixture.js";

function active(state, id) {
    return Boolean(
        state.container.querySelector(
            `[data-message-id="${id}"] .messages-reaction-chip--active`,
        ),
    );
}

function mutations(state) {
    return state.requests
        .filter(({ method }) => method === "POST")
        .map(({ body }) => JSON.parse(body).active);
}

for (const source of ["loaded history", "rolled-off latest page"]) {
    test(`acknowledged ${source} reactions refresh metadata and toggle off without replacing selected bodies`, async (context) => {
        const state = await history(context);
        const id = source === "loaded history" ? "message-5" : "message-50";
        if (source === "rolled-off latest page") {
            state.messages.push(message("message-100", 100));
            await state.render();
        }
        const body = state.body(id);
        const snapshot = select(
            state.document,
            body.querySelector("strong").firstChild,
        );
        await state.actions.toggleReaction(id, "♥");
        assert.equal(active(state, id), true);
        const chip = body
            .closest("[data-message-id]")
            .querySelector(".messages-reaction-chip");
        state.showReactionHoverPopup(chip);
        assert.match(state.popups.at(-1)[1], /Current reader/);
        assert.equal(state.body(id), body);
        assert.equal(snapshot.selection.anchorNode, snapshot.anchorNode);
        assert.equal(snapshot.selection.toString(), snapshot.text);
        assert.match(state.requests.at(-1).path, /before=/);
        await state.actions.toggleReaction(id, "♥");
        assert.deepEqual(mutations(state), [true, false]);
        assert.equal(active(state, id), false);
        assert.equal(state.body(id), body);
        assert.equal(snapshot.selection.toString(), snapshot.text);
        assert.equal(
            state.container.querySelectorAll(".messages-message-row").length,
            source === "loaded history" ? 100 : 101,
        );
        assert.equal(state.errors.length, 0);
    });
}

test("queued historical reactions expose the acknowledged final state and the next click reverses it", async (context) => {
    const state = await history(context);
    const body = state.body("message-5");
    const snapshot = select(
        state.document,
        body.querySelector("strong").firstChild,
    );
    state.offline.disconnect();
    await state.actions.toggleReaction("message-5", "♥");
    assert.equal(active(state, "message-5"), true);
    await state.actions.toggleReaction("message-5", "♥");
    assert.equal(active(state, "message-5"), false);
    const projected = await (
        await state.client.messagesFetch(
            `/api/v1/social/messages/rooms/room/messages?limit=50&before=${encodeURIComponent(message("boundary", 50).createdAt)}`,
        )
    ).json();
    assert.deepEqual(
        projected.data.find(({ id }) => id === "message-5").reactions,
        [],
    );
    assert.equal(state.body("message-5"), body);
    assert.equal(snapshot.selection.toString(), snapshot.text);
    assert.deepEqual(mutations(state), []);
    assert.equal(state.errors.length, 0);
});

test("a rejected historical metadata refresh retains the acknowledged reaction and does not retry the mutation", async (context) => {
    const state = await history(context);
    state.intercept = async (path, options) =>
        path.includes("before=") && options.method !== "POST"
            ? Response.json({}, { status: 403 })
            : null;
    await state.actions.toggleReaction("message-5", "♥");
    assert.equal(active(state, "message-5"), true);
    assert.deepEqual(mutations(state), [true]);
    assert.equal(state.errors.length, 2);
    await state.actions.toggleReaction("message-5", "♥");
    assert.equal(active(state, "message-5"), false);
    assert.deepEqual(mutations(state), [true, false]);
    assert.equal(state.errors.length, 4);
});

test("a failed reaction mutation leaves the shown state untouched", async (context) => {
    const state = await history(context);
    state.intercept = async (_path, options) =>
        options.method === "POST" ? Response.json({}, { status: 403 }) : null;
    await state.actions.toggleReaction("message-5", "♥");
    assert.equal(active(state, "message-5"), false);
    assert.deepEqual(mutations(state), [true]);
    assert.equal(state.errors.length, 2);
});

for (const change of ["room", "account"]) {
    test(`a stale reaction acknowledgement cannot alter a replacement ${change}`, async (context) => {
        const state = await history(context);
        const gate = deferred();
        let reached = false;
        state.intercept = async (_path, options) => {
            if (options.method === "POST") {
                reached = true;
                await gate.promise;
                return Response.json({ data: { active: true } });
            }
            return null;
        };
        const pending = state.actions.toggleReaction("message-5", "♥");
        await until(() => reached);
        state.current = false;
        state.messages = [message("message-5", 5)];
        await state.render({ [change]: "replacement" });
        const body = state.body("message-5");
        const snapshot = select(
            state.document,
            body.querySelector("strong").firstChild,
        );
        gate.resolve();
        await pending;
        assert.equal(active(state, "message-5"), false);
        assert.equal(state.body("message-5"), body);
        assert.equal(snapshot.selection.toString(), snapshot.text);
        assert.equal(state.errors.length, 0);
    });
}

test("later historical metadata can replace an acknowledged reaction after an earlier read failure", async (context) => {
    const state = await history(context);
    const body = state.body("message-5");
    const snapshot = select(
        state.document,
        body.querySelector("strong").firstChild,
    );
    state.intercept = async (path, options) =>
        path.includes("before=") && options.method !== "POST"
            ? Response.json({}, { status: 403 })
            : null;
    await state.actions.toggleReaction("message-5", "♥");
    assert.equal(active(state, "message-5"), true);
    state.intercept = async () => null;
    state.messages[5].reactions = [];
    await state.render({ refreshMessageId: "message-5" });
    assert.equal(active(state, "message-5"), false);
    assert.equal(state.body("message-5"), body);
    assert.equal(snapshot.selection.toString(), snapshot.text);
    assert.deepEqual(mutations(state), [true]);
});

test("an acknowledged latest-page reaction survives its failed refresh with selection intact", async (context) => {
    const state = await history(context);
    const body = state.body("message-99");
    const snapshot = select(
        state.document,
        body.querySelector("strong").firstChild,
    );
    state.intercept = async (path, options) =>
        path.includes("?limit=50") && options.method !== "POST"
            ? Response.json({}, { status: 503 })
            : null;
    await state.actions.toggleReaction("message-99", "♥");
    assert.equal(active(state, "message-99"), true);
    assert.equal(state.body("message-99"), body);
    assert.equal(snapshot.selection.toString(), snapshot.text);
    assert.deepEqual(mutations(state), [true]);
    assert.equal(state.errors.length, 2);
    await state.actions.toggleReaction("message-99", "♥");
    assert.equal(active(state, "message-99"), false);
    assert.equal(state.body("message-99"), body);
    assert.equal(snapshot.selection.toString(), snapshot.text);
    assert.deepEqual(mutations(state), [true, false]);
    assert.equal(state.errors.length, 4);
});
