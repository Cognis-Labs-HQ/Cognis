import assert from "node:assert/strict";
import test from "node:test";
import { mountFixture } from "./app-fixture.js";
import { deferred, Element, until } from "./fixture.js";

function clickAction(state, action) {
    const button = new Element();
    button.classList.contains = (name) => name === "messages-reaction-chip";
    button.getAttribute = (name) =>
        ({
            "data-message-id": "message-A",
            "data-emoji": "synthetic-emoji",
            "data-before-time": "2026-11-14T00:00:00.000Z",
        })[name];
    const selector =
        action === "reaction"
            ? "[data-message-id][data-emoji]"
            : ".messages-load-earlier-btn";
    return state.elements["messages-thread-list"].listeners.get("click")({
        target: {
            closest: (candidate) => (candidate === selector ? button : null),
        },
    });
}

function delayActionAt(state, boundary) {
    const gate = deferred();
    let reached = false;
    const block = async () => {
        reached = true;
        await gate.promise;
    };
    const payload = {
        data: [
            {
                id: "changed-A",
                ciphertext: "changed content",
                createdAt: "2026-11-13T01:00:00.000Z",
            },
        ],
    };
    state.key = async (id) => {
        if (boundary === "key" && id === "A") await block();
        return {};
    };
    state.intercept = async (url) => {
        if (url.endsWith("/reactions")) {
            if (boundary === "reaction") await block();
            return Response.json({});
        }
        if (!url.includes("/rooms/A/messages")) return;
        if (boundary === "thread") await block();
        if (boundary === "json")
            return {
                ok: true,
                json: async () => {
                    await block();
                    return payload;
                },
            };
        return Response.json(payload);
    };
    state.decrypt = async (_key, message) => {
        if (boundary === "decode" && message.id === "changed-A") await block();
        return message.ciphertext;
    };
    return { gate, reached: () => reached };
}

async function replaceOwner(state, change) {
    if (change === "selection") await state.select("B");
    if (change === "history") {
        state.context.window.location.pathname = "/messages/B";
        state.context.window.dispatchEvent(new Event("popstate"));
        await state.roomState.openRoom("B");
    }
    if (change === "remount") {
        state.context.window.location.pathname = "/messages/B";
        await state.remount();
    }
    if (change === "account") {
        state.storage.set("cognis_account", "replacement-account");
        state.input.value = "replacement account draft";
    }
    if (change === "cleanup") state.roomState.cleanup();
    if (change === "abort") state.controller.abort();
}

for (const action of ["reaction", "history"]) {
    const boundaries = ["key", "thread", "json", "decode"];
    if (action === "reaction") boundaries.unshift("reaction");
    for (const boundary of boundaries) {
        for (const change of [
            "current",
            "selection",
            "history",
            "remount",
            "account",
            "cleanup",
            "abort",
        ]) {
            test(`mounted ${action} owns rejected ${boundary} completion after ${change}`, async (context) => {
                const state = await mountFixture();
                context.after(() => state.controller.abort());
                await state.select("A");
                state.edit("retained draft");
                const failure = delayActionAt(state, boundary);
                const actionPromise = clickAction(state, action);
                await until(failure.reached);
                await replaceOwner(state, change);
                const thread = state.elements["messages-thread-list"].innerHTML;
                const header =
                    state.elements["messages-thread-header-slot"].innerHTML;
                const input = state.input.value;
                const path = state.context.window.location.pathname;
                const requests = state.requests.length;
                if (action === "reaction") {
                    assert.equal(
                        state.requests.filter(({ url }) =>
                            url.endsWith("/reactions"),
                        ).length,
                        1,
                    );
                }
                failure.gate.reject(new Error("synthetic_action_failure"));
                await actionPromise;
                assert.equal(state.requests.length, requests);
                assert.equal(
                    state.elements["messages-thread-list"].innerHTML,
                    thread,
                );
                assert.equal(
                    state.elements["messages-thread-header-slot"].innerHTML,
                    header,
                );
                assert.equal(state.input.value, input);
                assert.equal(state.context.window.location.pathname, path);
                if (change !== "current") {
                    assert.deepEqual(state.errors, []);
                    assert.deepEqual(state.toasts, []);
                    return;
                }
                assert.equal(state.errors.length, 1);
                assert.deepEqual(
                    JSON.parse(JSON.stringify(state.errors[0][1])),
                    {
                        component: "social-messages",
                        operation:
                            action === "reaction"
                                ? "toggleReaction"
                                : "loadEarlierMessages",
                        errorName: "Error",
                    },
                );
                assert.deepEqual(state.toasts, [
                    "module.social.messages.update_failed",
                ]);
                state.intercept = async () => null;
                state.key = async () => ({});
                state.decrypt = async (_key, message) => message.ciphertext;
                await clickAction(state, action);
                assert.ok(state.requests.length > requests);
                assert.equal(state.errors.length, 1);
                assert.equal(state.toasts.length, 1);
                assert.equal(state.input.value, "retained draft");
            });
        }
    }
    test(`mounted ${action} reports current HTTP failure without retrying automatically`, async (context) => {
        const state = await mountFixture();
        context.after(() => state.controller.abort());
        await state.select("A");
        let attempts = 0;
        state.intercept = async (url) => {
            if (
                action === "reaction"
                    ? url.endsWith("/reactions")
                    : url.includes("/rooms/A/messages")
            ) {
                attempts += 1;
                return Response.json({}, { status: 503 });
            }
        };
        await clickAction(state, action);
        assert.equal(attempts, 1);
        assert.equal(state.errors.length, 1);
        assert.deepEqual(state.toasts, [
            "module.social.messages.update_failed",
        ]);
        await clickAction(state, action);
        assert.equal(attempts, 2);
        assert.equal(state.errors.length, 2);
        assert.equal(state.toasts.length, 2);
    });
}
