import assert from "node:assert/strict";
import test from "node:test";
import { mountFixture } from "./app-fixture.js";
import { deferred, until } from "./fixture.js";

test("mounted Messages keeps selected URL, rendered thread and per-room drafts together", async (context) => {
    const state = await mountFixture();
    context.after(() => state.controller.abort());
    await state.select("A");
    state.edit("A draft");
    await state.select("B");
    state.edit("B draft");
    await state.select("A");
    assert.equal(state.input.value, "A draft");
    const gate = deferred();
    let reached = false;
    state.intercept = async (url) => {
        if (url.endsWith("/rooms/A")) {
            reached = true;
            await gate.promise;
        }
    };
    const older = state.select("A");
    await until(() => reached);
    await state.select("B");
    gate.resolve();
    await older;
    assert.equal(state.context.window.location.pathname, "/messages/B");
    assert.equal(state.input.value, "B draft");
    assert.match(state.elements["messages-thread-list"].innerHTML, /content-B/);
    assert.deepEqual(state.history, [
        "/messages/A",
        "/messages/B",
        "/messages/A",
        "/messages/B",
    ]);
});

test("mounted submit/input handlers preserve a newer stored draft through a successful send and refresh", async (context) => {
    const state = await mountFixture();
    context.after(() => state.controller.abort());
    await state.select("A");
    state.edit("First draft");
    const gate = deferred();
    let reached = false;
    state.intercept = async (url, options) => {
        if (url.endsWith("/messages") && options.method === "POST") {
            reached = true;
            await gate.promise;
            return Response.json({ queued: false });
        }
    };
    const sending = state.submit();
    await until(() => reached);
    state.edit("Next draft");
    await state.submit();
    gate.resolve();
    await sending;
    assert.equal(state.input.value, "Next draft");
    const messages = state.requests.filter(
        ({ url, method }) => url.endsWith("/messages") && method === "POST",
    );
    assert.equal(messages.length, 1);
    assert.equal(
        JSON.parse(messages[0].body).ciphertext,
        "encrypted:First draft",
    );
    await state.select("B");
    await state.select("A");
    assert.equal(state.input.value, "Next draft");
});

for (const change of ["history", "remount", "account"]) {
    test(`mounted failure completion cannot affect ${change} replacement`, async (context) => {
        const state = await mountFixture();
        context.after(() => state.controller.abort());
        await state.select("A");
        state.edit("A draft");
        await state.select("B");
        state.edit("B draft");
        await state.select("A");
        const gate = deferred();
        let reached = false;
        state.intercept = async (url) => {
            if (url.includes("/rooms/A/messages")) {
                reached = true;
                await gate.promise;
            }
        };
        const refresh = state.roomState.refreshInBackground();
        await until(() => reached);
        if (change === "history") {
            state.context.window.location.pathname = "/messages/B";
            state.context.window.dispatchEvent(new Event("popstate"));
            await state.roomState.openRoom("B");
        } else if (change === "remount") {
            state.context.window.location.pathname = "/messages/B";
            await state.remount();
        } else {
            state.storage.set("cognis_account", "replacement-account");
            state.input.value = "replacement account draft";
        }
        const input = state.input.value;
        const header = state.elements["messages-thread-header-slot"].innerHTML;
        const path = state.context.window.location.pathname;
        gate.reject(new Error("obsolete_mounted_refresh"));
        await refresh;
        assert.equal(state.input.value, input);
        assert.equal(state.context.window.location.pathname, path);
        assert.equal(
            state.elements["messages-thread-header-slot"].innerHTML,
            header,
        );
        assert.deepEqual(state.toasts, []);
        assert.deepEqual(state.errors, []);
        if (change !== "account") {
            assert.equal(state.input.value, "B draft");
            state.intercept = async () => null;
            state.context.window.location.pathname = "/messages/A";
            state.context.window.dispatchEvent(new Event("popstate"));
            await state.roomState.openRoom("A");
            assert.equal(state.input.value, "A draft");
        }
    });
}

test("mounted keyring refresh reports current list failures and stops stale follow-up reads", async (context) => {
    const state = await mountFixture();
    context.after(() => state.controller.abort());
    await state.select("A");
    state.edit("A draft");
    const event = () =>
        Object.assign(new Event("cognis:keyring-event"), {
            detail: { type: "unlock" },
        });
    state.intercept = async (url) => {
        if (url.endsWith("/rooms")) throw new Error("current_list_failure");
    };
    state.context.window.dispatchEvent(event());
    await until(() => state.toasts.length === 1);
    assert.equal(state.errors[0][1].operation, "refreshDecryptedContent");
    assert.equal(state.input.value, "A draft");
    const gate = deferred();
    let reached = false;
    state.intercept = async (url) => {
        if (url.endsWith("/rooms")) {
            reached = true;
            await gate.promise;
        }
    };
    state.context.window.dispatchEvent(event());
    await until(() => reached);
    await state.select("B");
    const requests = state.requests.length;
    gate.reject(new Error("obsolete_list_failure"));
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(state.requests.length, requests);
    assert.equal(state.errors.length, 1);
    assert.equal(state.toasts.length, 1);
    assert.equal(state.context.window.location.pathname, "/messages/B");
});

test("mounted failed-send JSON cannot notify or reload for a replacement account", async (context) => {
    const state = await mountFixture();
    context.after(() => state.controller.abort());
    await state.select("A");
    state.edit("Unsent draft");
    const gate = deferred();
    let reached = false;
    state.intercept = async (url, options) => {
        if (url.endsWith("/messages") && options.method === "POST")
            return {
                ok: false,
                json: async () => {
                    reached = true;
                    return gate.promise;
                },
            };
    };
    const sending = state.submit();
    await until(() => reached);
    state.storage.set("cognis_account", "replacement-account");
    state.input.value = "replacement account draft";
    const requests = state.requests.length;
    gate.resolve({ error: { code: "not_member" } });
    await sending;
    assert.equal(state.input.value, "replacement account draft");
    assert.equal(state.requests.length, requests);
    assert.deepEqual(state.toasts, []);
    assert.deepEqual(state.errors, []);
});
