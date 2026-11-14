import assert from "node:assert/strict";
import test from "node:test";
import { createRoomFixture, deferred, until } from "./fixture.js";
import { createDraftFixture } from "./draft-fixture.js";

function failRefreshAt(state, boundary) {
    const gate = deferred();
    let reached = false;
    const block = async () => {
        reached = true;
        await gate.promise;
    };
    state.intercept = async (url) => {
        if (boundary === "list" && url.endsWith("/rooms")) await block();
        if (!url.includes("/rooms/A/messages")) return;
        if (boundary === "thread") await block();
        if (boundary === "decode")
            return Response.json({
                data: [
                    {
                        id: "refresh-A",
                        ciphertext: "new content",
                        createdAt: "2026-11-14T01:00:00.000Z",
                    },
                ],
            });
    };
    state.key = async (id) => {
        if (boundary === "key" && id === "A") await block();
        return {};
    };
    state.decrypt = async (_key, message) => {
        if (boundary === "decode" && message.id === "refresh-A") await block();
        return message.ciphertext;
    };
    return { gate, reached: () => reached };
}

function invalidate(state, change) {
    if (change === "selection") state.roomState.setSelectedRoomId("B");
    if (change === "account")
        state.storage.set("cognis_account", "replacement-account");
    if (change === "cleanup") state.roomState.cleanup();
    if (change === "abort") state.controller.abort();
}

async function prepareSendFailure() {
    const state = createRoomFixture();
    const draft = createDraftFixture();
    await state.roomState.loadInitialRooms();
    state.roomState.setSelectedRoomId("A");
    draft.edit("Original draft");
    const gate = deferred();
    let reached = false;
    state.dependencies["./message-templates.js"] = {
        resolveMessageTemplateVariables: (value) => value,
    };
    state.dependencies["./message-utils.js"].encryptMessage = async (
        _key,
        text,
    ) => ({
        iv: "synthetic",
        ciphertext: text,
    });
    state.intercept = async (url, options) =>
        url.endsWith("/messages") && options.method === "POST"
            ? {
                  ok: false,
                  json: async () => {
                      reached = true;
                      return gate.promise;
                  },
              }
            : null;
    const sender = state.load("send-message.js").createMessageSender({
        roomState: state.roomState,
        currentAccountId: "reader",
        requireRoomKey: async () => ({}),
        drafts: draft.drafts,
        renderComposerPreview() {},
        i18n: { t: String },
    });
    const sending = sender(new Event("submit", { cancelable: true }));
    await until(() => reached);
    return { state, draft, gate, sending };
}

for (const code of ["synthetic_failure", "not_member", "chat_archived"]) {
    for (const change of ["selection", "account", "cleanup"]) {
        for (const rejected of [false, true]) {
            test(`failed-send JSON ${code} is obsolete after ${change}; rejected=${rejected}`, async () => {
                const { state, draft, gate, sending } =
                    await prepareSendFailure();
                invalidate(state, change);
                const requestCount = state.requests.length;
                if (rejected) gate.reject(new Error("synthetic_json_failure"));
                else gate.resolve({ error: { code } });
                await sending;
                assert.deepEqual(state.toasts, []);
                assert.deepEqual(state.errors, []);
                assert.equal(state.requests.length, requestCount);
                assert.equal(draft.saved(), "Original draft");
                state.roomState.cleanup();
            });
        }
    }
}

for (const [code, key] of [
    ["synthetic_failure", "send_failed"],
    ["not_member", "not_member_cannot_send"],
    ["chat_archived", "archived_cannot_send"],
]) {
    test(`current failed-send JSON ${code} remains visible and logged`, async () => {
        const { state, draft, gate, sending } = await prepareSendFailure();
        gate.resolve({ error: { code } });
        await sending;
        assert.deepEqual(state.toasts, [`module.social.messages.${key}`]);
        assert.equal(state.errors.length, 1);
        assert.equal(
            state.requests.filter(({ url }) => url.endsWith("/rooms")).length,
            code === "synthetic_failure" ? 1 : 2,
        );
        assert.equal(draft.saved(), "Original draft");
        state.roomState.cleanup();
    });
}

test("current malformed failure JSON keeps visible failure feedback", async () => {
    const { state, draft, gate, sending } = await prepareSendFailure();
    gate.reject(new Error("malformed_failure_payload"));
    await sending;
    assert.deepEqual(state.toasts, ["module.social.messages.send_failed"]);
    assert.equal(state.errors.length, 1);
    assert.equal(draft.saved(), "Original draft");
    state.roomState.cleanup();
});

for (const boundary of ["list", "key", "thread", "decode"]) {
    for (const change of ["selection", "account", "cleanup", "abort"]) {
        test(`rejected ${boundary} refresh is ignored after ${change}`, async () => {
            const state = createRoomFixture();
            await state.roomState.loadInitialRooms();
            await state.roomState.openRoom("A");
            const failure = failRefreshAt(state, boundary);
            const refresh = state.roomState.refreshActiveConversation();
            const observed = refresh.then(
                () => null,
                (error) => error,
            );
            await until(failure.reached);
            invalidate(state, change);
            state.elements["messages-thread-list"].innerHTML =
                "replacement-view";
            const requestCount = state.requests.length;
            failure.gate.reject(new Error("late_refresh_failure"));
            assert.equal(await observed, null);
            assert.equal(
                state.elements["messages-thread-list"].innerHTML,
                "replacement-view",
            );
            assert.equal(state.requests.length, requestCount);
            assert.deepEqual(state.errors, []);
            assert.deepEqual(state.toasts, []);
            state.roomState.cleanup();
        });
    }

    test(`current ${boundary} refresh rejection remains observable to its caller`, async () => {
        const state = createRoomFixture();
        await state.roomState.loadInitialRooms();
        await state.roomState.openRoom("A");
        const failure = failRefreshAt(state, boundary);
        const refresh = state.roomState.refreshActiveConversation();
        const rejected = assert.rejects(refresh, /current_refresh_failure/);
        await until(failure.reached);
        failure.gate.reject(new Error("current_refresh_failure"));
        await rejected;
        state.roomState.cleanup();
    });

    test(`polling handles current ${boundary} failure once, retains retry, and reports recovery`, async () => {
        const state = createRoomFixture();
        await state.roomState.loadInitialRooms();
        await state.roomState.openRoom("A");
        const intervals = new Map();
        state.context.setInterval = (callback, milliseconds) => {
            intervals.set(milliseconds, callback);
            return milliseconds;
        };
        state.context.clearInterval = (id) => intervals.delete(id);
        state.roomState.startLiveRefreshPolling();
        const poll = intervals.get(2500);
        assert.equal(typeof poll, "function");
        const failure = failRefreshAt(state, boundary);
        const refresh = poll();
        assert.equal(poll(), refresh);
        await until(failure.reached);
        failure.gate.reject(new Error("polling_refresh_failure"));
        await refresh;
        assert.equal(state.errors.length, 1);
        assert.equal(state.errors[0][1].operation, "refreshConversation");
        assert.deepEqual(state.toasts, [
            "module.social.messages.update_failed",
        ]);
        await poll();
        assert.equal(state.errors.length, 2);
        assert.equal(state.toasts.length, 1);
        state.intercept = async () => null;
        state.key = async () => ({});
        state.decrypt = async (_key, message) => message.ciphertext;
        await poll();
        const next = failRefreshAt(state, boundary);
        const retry = poll();
        await until(next.reached);
        next.gate.reject(new Error("new_polling_failure"));
        await retry;
        assert.equal(state.toasts.length, 2);
        state.roomState.cleanup();
        assert.equal(intervals.size, 0);
    });
}

for (const change of ["current", "selection", "account", "cleanup"]) {
    test(`typing polling owns rejected completion for ${change} views`, async () => {
        const state = createRoomFixture();
        await state.roomState.loadInitialRooms();
        state.roomState.setSelectedRoomId("A");
        const intervals = new Map();
        state.context.setInterval = (callback, milliseconds) => {
            intervals.set(milliseconds, callback);
            return milliseconds;
        };
        state.context.clearInterval = (id) => intervals.delete(id);
        state.roomState.startTypingPolling();
        const gate = deferred();
        let reached = false;
        state.intercept = async (url) => {
            if (url.endsWith("/typing")) {
                reached = true;
                await gate.promise;
            }
        };
        const refresh = intervals.get(3000)();
        await until(() => reached);
        invalidate(state, change);
        gate.reject(new Error("typing_refresh_failure"));
        await refresh;
        assert.equal(state.errors.length, change === "current" ? 1 : 0);
        assert.equal(state.toasts.length, change === "current" ? 1 : 0);
        state.roomState.cleanup();
        assert.equal(intervals.size, 0);
    });
}

test("an obsolete background failure cannot release a newer pending refresh", async () => {
    const state = createRoomFixture();
    await state.roomState.loadInitialRooms();
    await state.roomState.openRoom("A");
    const olderGate = deferred();
    let olderReached = false;
    state.intercept = async (url) => {
        if (url.includes("/rooms/A/messages")) {
            olderReached = true;
            await olderGate.promise;
        }
    };
    const older = state.roomState.refreshInBackground();
    await until(() => olderReached);
    await state.roomState.openRoom("B");
    const newerGate = deferred();
    let newerReached = false;
    state.intercept = async (url) => {
        if (url.includes("/rooms/B/messages")) {
            newerReached = true;
            await newerGate.promise;
        }
    };
    const newer = state.roomState.refreshInBackground();
    await until(() => newerReached);
    olderGate.reject(new Error("obsolete_failure"));
    await older;
    assert.equal(state.roomState.refreshInBackground(), newer);
    assert.deepEqual(state.errors, []);
    assert.deepEqual(state.toasts, []);
    newerGate.reject(new Error("current_failure"));
    await newer;
    assert.equal(state.errors.length, 1);
    assert.deepEqual(state.toasts, ["module.social.messages.update_failed"]);
    state.roomState.cleanup();
});
