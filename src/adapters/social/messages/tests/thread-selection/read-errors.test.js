import test from "node:test";
import assert from "node:assert/strict";
import {
    createRenderer,
    createLoadedHistory,
    message,
    select,
} from "./fixture.js";
import { deferred, until } from "../async-state/fixture.js";

for (const id of ["message-5", "message-99"]) {
    for (const stage of ["http", "transport", "json", "decode"]) {
        test(`superseded ${id} reaction ${stage} read errors stay silent`, async (context) => {
            const state = await createLoadedHistory(context);
            const gate = deferred();
            let reached = false;
            if (stage === "decode") {
                state.decrypt = async (_key, record) => {
                    if (record.id === id) {
                        reached = true;
                        await gate.promise;
                        throw new Error("old decode");
                    }
                    return record.ciphertext;
                };
            } else {
                state.intercept = async (path, options) => {
                    if (
                        path.includes("?limit=50") &&
                        options.method !== "POST"
                    ) {
                        reached = true;
                        await gate.promise;
                        if (stage === "transport")
                            throw new Error("old transport");
                        if (stage === "json") return new Response("{");
                        return Response.json({}, { status: 503 });
                    }
                    return null;
                };
            }
            const pending = state.actions.toggleReaction(id, "♥");
            await until(() => reached);
            state.decrypt = async (_key, record) => record.ciphertext;
            state.intercept = async () => null;
            if (stage !== "decode") state.offline.invalidateCache();
            state.messages[99].senderDisplayName = "Newer sender";
            await state.render();
            const body = state.body(id);
            const snapshot = select(
                state.document,
                body.querySelector("strong").firstChild,
            );
            gate.resolve();
            await pending;
            assert.equal(state.errors.length, 0);
            assert.equal(state.body(id), body);
            assert.equal(snapshot.selection.toString(), snapshot.text);
            assert.ok(
                body
                    .closest("[data-message-id]")
                    .querySelector(".messages-reaction-chip--active"),
            );
            assert.equal(
                state.requests.filter(({ method }) => method === "POST").length,
                1,
            );
        });
    }
}

for (const stage of ["transport", "json", "decode"]) {
    test(`current reaction ${stage} read failure remains visible`, async (context) => {
        const state = await createLoadedHistory(context);
        if (stage === "decode")
            state.decrypt = async () => {
                throw new Error("current decode");
            };
        else
            state.intercept = async (path, options) => {
                if (path.includes("?limit=50") && options.method !== "POST") {
                    if (stage === "transport")
                        throw new Error("current transport");
                    return new Response("{");
                }
                return null;
            };
        await state.actions.toggleReaction("message-5", "♥");
        assert.equal(state.errors.length, 2);
        assert.ok(
            state
                .body("message-5")
                .closest("[data-message-id]")
                .querySelector(".messages-reaction-chip--active"),
        );
        assert.equal(
            state.requests.filter(({ method }) => method === "POST").length,
            1,
        );
    });
}

test("an unacknowledged mutation failure remains visible after a newer successful read", async (context) => {
    const state = await createLoadedHistory(context);
    const gate = deferred();
    let reached = false;
    state.intercept = async (_path, options) => {
        if (options.method === "POST") {
            reached = true;
            await gate.promise;
            throw new Error("mutation failed");
        }
        return null;
    };
    const pending = state.actions.toggleReaction("message-5", "♥");
    await until(() => reached);
    state.messages[99].senderDisplayName = "Newer sender";
    await state.render();
    gate.resolve();
    await pending;
    assert.equal(state.errors.length, 2);
    assert.equal(
        state.container.querySelector(".messages-reaction-chip--active"),
        null,
    );
    assert.equal(
        state.requests.filter(({ method }) => method === "POST").length,
        1,
    );
});

for (const replacement of ["style", "key", "remount"]) {
    for (const fails of [false, true]) {
        test(`obsolete ${fails ? "failed" : "successful"} action decode stays silent after same-room ${replacement}`, async (context) => {
            const state = createRenderer();
            context.after(state.dispose);
            state.messages = [message("latest")];
            await state.render();
            const gate = deferred();
            let reached = false;
            state.decrypt = async (_key, record) => {
                reached = true;
                await gate.promise;
                if (fails) throw new Error("obsolete decode");
                return record.ciphertext;
            };
            const pending = state.actions.toggleReaction("latest", "♥");
            await until(() => reached);
            state.decrypt = async (_key, record) => record.ciphertext;
            if (replacement === "style") state.style = "irc";
            if (replacement === "key") state.key = {};
            if (replacement === "remount") state.container.replaceChildren();
            await state.render();
            const body = state.body("latest");
            const snapshot = select(
                state.document,
                body.querySelector("strong").firstChild,
            );
            const requests = state.requests.length;
            gate.resolve();
            await pending;
            assert.equal(state.errors.length, 0);
            assert.equal(state.requests.length, requests);
            assert.equal(state.body("latest"), body);
            assert.equal(snapshot.selection.toString(), snapshot.text);
            assert.ok(
                body
                    .closest("[data-message-id]")
                    .querySelector(".messages-reaction-chip--active"),
            );
        });
    }
}
