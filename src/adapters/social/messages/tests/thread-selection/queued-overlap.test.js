import test from "node:test";
import assert from "node:assert/strict";
import {
    createRenderer,
    message,
    select,
    createLoadedHistory as setup,
} from "./fixture.js";
import { deferred, until } from "../async-state/fixture.js";

const path = "/api/v1/social/messages/rooms/room/messages";
const historyCursor = message("boundary", 50).createdAt;

async function enqueue(state) {
    return (
        await (
            await state.client.messagesFetch(path, {
                method: "POST",
                body: JSON.stringify({
                    ciphertext: "Queued selection remains",
                    iv: "synthetic",
                }),
            })
        ).json()
    ).data;
}

async function delay(state, kind) {
    const gate = deferred();
    let reached = false;
    state.decrypt = async (_key, record) => {
        if (record.id === (kind === "history" ? "message-0" : "message-99")) {
            reached = true;
            await gate.promise;
        }
        return record.ciphertext;
    };
    const pending = state.render(
        kind === "history" ? { before: historyCursor } : { force: true },
    );
    await until(() => reached);
    state.decrypt = async (_key, record) => record.ciphertext;
    return { pending, release: () => gate.resolve() };
}

for (const kind of ["history", "live"]) {
    const otherPage = kind === "history" ? {} : { before: historyCursor };
    test(`late ${kind} response cannot remove a newer queued body or its selection`, async (context) => {
        const state = await setup(context);
        const delayed = await delay(state, kind);
        state.offline.disconnect();
        const queued = await enqueue(state);
        await state.render(otherPage);
        const body = state.body(queued.id);
        const snapshot = select(
            state.document,
            body.querySelector("p").firstChild,
        );
        delayed.release();
        await delayed.pending;
        assert.equal(state.body(queued.id), body);
        assert.equal(snapshot.selection.anchorNode, snapshot.anchorNode);
        assert.equal(snapshot.selection.toString(), snapshot.text);
        assert.equal(
            state.container.querySelectorAll(".messages-message-row").length,
            101,
        );
        await state.render();
        assert.equal(state.body(queued.id), body);
        assert.equal((await state.render()).changed, false);
        assert.equal(snapshot.selection.toString(), snapshot.text);
    });

    for (const removal of ["clear", "flush"]) {
        test(`late ${kind} response cannot resurrect a queued row after ${removal}`, async (context) => {
            const state = await setup(context);
            state.offline.disconnect();
            const queued = await enqueue(state);
            await state.render();
            const delayed = await delay(state, kind);
            if (removal === "clear") {
                await state.offline.outbox.clear();
            } else {
                state.intercept = async (requestPath, options) => {
                    if (requestPath === path && options.method === "POST") {
                        const submitted = JSON.parse(options.body);
                        const saved = message(submitted.operationId, 100, {
                            ciphertext: submitted.ciphertext,
                        });
                        state.messages.push(saved);
                        return Response.json({ data: saved });
                    }
                    return null;
                };
                state.offline.reconnect();
                assert.equal((await state.offline.outbox.flush()).sent, 1);
            }
            await state.render(otherPage);
            delayed.release();
            await delayed.pending;
            if (removal === "clear" || kind === "live")
                assert.equal(state.body(queued.id), null);
            else {
                assert.equal(
                    state.body(queued.id)?.textContent,
                    queued.ciphertext,
                );
                assert.equal(
                    state
                        .body(queued.id)
                        .closest("[data-message-id]")
                        .querySelector("time").dateTime,
                    message("acknowledged", 100).createdAt,
                );
            }
            await state.render();
            assert.equal((await state.render()).changed, false);

            if (removal === "clear") assert.equal(state.body(queued.id), null);
            else {
                assert.equal(
                    state.body(queued.id)?.textContent,
                    queued.ciphertext,
                );
                assert.equal(
                    state
                        .body(queued.id)
                        .closest("[data-message-id]")
                        .querySelector("time").dateTime,
                    message("acknowledged", 100).createdAt,
                );
            }
        });
    }
}

test("an unchanged latest poll advances queued snapshot ownership before delayed history completes", async (context) => {
    const state = await setup(context);
    state.offline.disconnect();
    await state.render();
    await enqueue(state);
    // History captures the queued projection while the displayed latest page
    // still matches its earlier empty-queue signature.
    const delayed = await delay(state, "history");
    await state.offline.outbox.clear();
    assert.equal((await state.render()).changed, false);
    delayed.release();
    await delayed.pending;
    assert.equal(
        state.container.querySelectorAll(".messages-message-row").length,
        100,
    );
    await state.render();
    assert.equal((await state.render()).changed, false);
});

test("a request that captures a newer queue late invalidates its discarded projection signature", async (context) => {
    const state = await setup(context);
    const gate = deferred();
    let reached = false;
    state.intercept = async (requestPath) => {
        if (requestPath === path + "?limit=50") {
            reached = true;
            await gate.promise;
        }
        return null;
    };
    const pending = state.render({ force: true });
    await until(() => reached);
    await state.render({ before: historyCursor });
    const body = state.body("message-5");
    const snapshot = select(
        state.document,
        body.querySelector("strong").firstChild,
    );
    state.offline.disconnect();
    const queued = await enqueue(state);
    gate.resolve();
    await pending;
    // The older request captured q after the newer history request completed.
    // Its queue was discarded, so its raw signature cannot authorize a no-op.
    assert.equal(state.body(queued.id), null);
    assert.equal((await state.render()).changed, true);
    assert.equal(state.body(queued.id)?.textContent, queued.ciphertext);
    assert.equal((await state.render()).changed, false);
    assert.equal(state.body("message-5"), body);
    assert.equal(snapshot.selection.toString(), snapshot.text);
});

test("an older ordinary live response retains a newer acknowledged row and its selection", async (context) => {
    const state = await setup(context);
    state.offline.disconnect();
    const queued = await enqueue(state);
    await state.render();
    state.offline.reconnect();
    state.messages[99].readBy = [
        { accountId: "reader", displayName: "Reader" },
    ];
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
    state.intercept = async (requestPath, options) => {
        if (requestPath === path && options.method === "POST") {
            const input = JSON.parse(options.body);
            const saved = { ...queued, queued: false, id: input.operationId };
            state.messages.push(saved);
            return Response.json({ data: saved });
        }
        return null;
    };
    assert.equal((await state.offline.outbox.flush()).sent, 1);
    await state.render();
    const body = state.body(queued.id);
    const snapshot = select(state.document, body.querySelector("p").firstChild);
    gate.resolve();
    await pending;
    assert.equal(state.body(queued.id), body);
    assert.equal(snapshot.selection.anchorNode, snapshot.anchorNode);
    assert.equal(snapshot.selection.toString(), snapshot.text);
    assert.equal(
        state.container.querySelectorAll(".messages-message-row").length,
        101,
    );
    await state.render();
    assert.equal((await state.render()).changed, false);
    assert.equal(state.body(queued.id), body);
    assert.equal(snapshot.selection.toString(), snapshot.text);
});

for (const force of [false, true]) {
    test(`older ${force ? "forced" : "ordinary"} latest response preserves newer metadata and leaves history to explicit requests`, async (context) => {
        const state = createRenderer();
        context.after(state.dispose);
        state.messages = Array.from({ length: 100 }, (_value, index) =>
            message(`message-${index}`, index),
        );
        const gate = deferred();
        let reached = false;
        state.decrypt = async (_key, record) => {
            if (record.id === "message-99") {
                reached = true;
                await gate.promise;
            }
            return record.ciphertext;
        };
        const pending = state.render({ force });
        await until(() => reached);
        state.decrypt = async (_key, record) => record.ciphertext;
        state.messages[99].senderDisplayName = "Newer sender";
        state.messages.push(message("message-100", 100));
        await state.render();
        const body = state.body("message-100");
        const snapshot = select(
            state.document,
            body.querySelector("strong").firstChild,
        );
        gate.resolve();
        await pending;
        assert.equal(state.body("message-100"), body);
        assert.equal(snapshot.selection.toString(), snapshot.text);
        assert.equal(
            state.container.querySelector('[data-message-id="message-99"]')
                .dataset.searchLabel,
            "Newer sender",
        );
        assert.equal(state.body("message-50"), null);
        assert.equal(
            state.container.querySelectorAll(".messages-message-row").length,
            50,
        );
        await state.render({ before: message("boundary", 51).createdAt });
        assert.ok(
            state.body("message-50"),
            "An explicit history request still merges its earlier page",
        );
        assert.equal(state.body("message-100"), body);
        await state.render();
        assert.equal((await state.render()).changed, false);
        assert.equal(snapshot.selection.toString(), snapshot.text);
    });
}

test("an older latest response does not resurrect rows excluded by a newer complete page", async (context) => {
    const state = await setup(context);
    const delayed = await delay(state, "live");
    state.messages = state.messages.slice(80);
    await state.render();
    const body = state.body("message-99");
    const snapshot = select(
        state.document,
        body.querySelector("strong").firstChild,
    );
    delayed.release();
    await delayed.pending;
    assert.equal(
        state.container.querySelectorAll(".messages-message-row").length,
        20,
    );
    assert.equal(state.body("message-50"), null);
    assert.equal(state.body("message-99"), body);
    assert.equal(snapshot.selection.toString(), snapshot.text);
    assert.equal(
        state.container.querySelector(".messages-load-earlier-btn"),
        null,
    );
});

for (const newer of ["live", "history"]) {
    for (const failure of ["http", "rejection"]) {
        test(`stale ${failure} cannot clear a newer ${newer} publication`, async (context) => {
            const state = await setup(context);
            const gate = deferred();
            let reached = false;
            state.intercept = async (requestPath) => {
                if (requestPath === path + "?limit=50") {
                    reached = true;
                    await gate.promise;
                    if (failure === "rejection") throw new Error("stale read");
                    return Response.json({}, { status: 503 });
                }
                return null;
            };
            const pending = state.render();
            // Observe rejection immediately while retaining the result for assertions.
            const settled = pending.then(
                (value) => ({ value }),
                (error) => ({ error }),
            );
            await until(() => reached);
            state.intercept = async () => null;
            state.messages[99].senderDisplayName = "Current sender";
            // A public cache invalidation allows a fresh latest read instead
            // of coalescing it with the still-pending older network request.
            if (newer === "live") state.offline.invalidateCache();
            await state.render(
                newer === "history" ? { before: historyCursor } : {},
            );
            const body = state.body("message-5");
            const snapshot = select(
                state.document,
                body.querySelector("strong").firstChild,
            );
            gate.resolve();
            const result = await settled;
            assert.equal(result.error, undefined);
            assert.equal(result.value.changed, false);
            assert.equal(state.errors.length, 0);
            assert.equal(state.body("message-5"), body);
            assert.equal(snapshot.selection.toString(), snapshot.text);
            assert.equal(
                state.container.querySelectorAll(".messages-message-row")
                    .length,
                100,
            );
        });
    }
}

test("stale latest results return current pending-request state after an overlapping history publication", async (context) => {
    const state = await setup(context);
    const live = deferred();
    const history = deferred();
    const reached = new Set();
    state.pendingRequest = { id: "old-request", direction: "incoming" };
    state.decrypt = async (_key, record) => {
        if (record.id === "message-99" || record.id === "message-0") {
            reached.add(record.id);
            await (record.id === "message-99" ? live : history).promise;
        }
        return record.ciphertext;
    };
    const pendingLive = state.render({ force: true });
    await until(() => reached.has("message-99"));
    const pendingHistory = state.render({ before: historyCursor });
    await until(() => reached.has("message-0"));
    state.decrypt = async (_key, record) => record.ciphertext;
    state.pendingRequest = null;
    state.messages[99].senderDisplayName = "Current sender";
    await state.render();
    history.resolve();
    await pendingHistory;
    live.resolve();
    const result = await pendingLive;
    assert.equal(result.changed, false);
    assert.equal(result.pendingRequest, null);
    assert.equal(
        state.container.querySelector('[data-message-id="message-99"]').dataset
            .searchLabel,
        "Current sender",
    );
});
