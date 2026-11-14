import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { createDraftFixture } from "./async-state/draft-fixture.js";
import { deferred, until } from "./async-state/fixture.js";

function fixture(send, { refreshError, key, encrypt } = {}) {
    const draft = createDraftFixture();
    const toasts = [];
    const refreshed = [];
    const requests = [];
    const { createMessageSender } = loadTestModule(
        new URL("../ui/send-message.js", import.meta.url),
        {
            "./offline-client.js": {
                messagesFetch: async (...args) => {
                    requests.push(args);
                    return send(...args);
                },
            },
            "./message-utils.js": {
                encryptMessage:
                    encrypt ??
                    (async (_key, text) => ({
                        ciphertext: `encrypted:${text}`,
                        iv: "iv",
                    })),
            },
            "./message-templates.js": {
                resolveMessageTemplateVariables: (value) => value,
            },
            "/static/reuse/toast.js": {
                showToast: (text) => toasts.push(text),
            },
        },
        { console: { error() {}, info() {} } },
    );
    let generation = 0;
    const handler = createMessageSender({
        roomState: {
            getSelectedRoomId: draft.selected,
            getSelectedRoom: () => ({ canSend: true }),
            isActive: draft.isActive,
            captureRoom: () => {
                const expected = generation;
                return () => draft.isActive() && expected === generation;
            },
            queueTypingUpdate() {},
            refreshActiveConversation: async () => {
                if (refreshError) throw refreshError;
                refreshed.push(draft.selected());
            },
            refreshTypingIndicator: async () => {},
            startLiveRefreshPolling() {},
            reloadRoomsList: async () => {},
        },
        currentAccountId: "reader",
        requireRoomKey: key ?? (async () => ({})),
        drafts: draft.drafts,
        renderComposerPreview() {},
        i18n: { t: String },
    });
    draft.edit(" Draft message ");
    return {
        ...draft,
        toasts,
        refreshed,
        requests,
        select: (id) => {
            generation += 1;
            draft.select(id);
        },
        submit: () => handler(new Event("submit", { cancelable: true })),
    };
}

for (const queued of [false, true]) {
    test(`acknowledged delivery clears only its unchanged draft; queued=${queued}`, async () => {
        const state = fixture(async () => Response.json({ queued }));
        await state.submit();
        assert.equal(state.input.value, "");
        assert.equal(state.saved(), "");
        assert.deepEqual(state.toasts, []);
        assert.deepEqual(state.refreshed, ["A"]);
        await state.submit();
        assert.equal(state.requests.length, 1);
    });
}

for (const boundary of ["key", "encryption", "transport"]) {
    test(`new edits survive delayed ${boundary}, including revision changes back to identical text`, async () => {
        for (const newer of ["New unsent draft", " Draft message "]) {
            const gate = deferred();
            let reached = false;
            const wait = async () => {
                reached = true;
                await gate.promise;
            };
            const state = fixture(
                async () => {
                    if (boundary === "transport") await wait();
                    return Response.json({ queued: true });
                },
                {
                    key: async () => {
                        if (boundary === "key") await wait();
                        return {};
                    },
                    encrypt: async (_key, text) => {
                        if (boundary === "encryption") await wait();
                        return { iv: "iv", ciphertext: `encrypted:${text}` };
                    },
                },
            );
            const pending = state.submit();
            await until(() => reached);
            await state.submit();
            state.edit("intermediate");
            state.edit(newer);
            gate.resolve();
            await pending;
            assert.equal(state.input.value, newer);
            assert.equal(state.saved(), newer);
            assert.equal(state.requests.length, 1);
            assert.equal(
                JSON.parse(state.requests[0][1].body).ciphertext,
                "encrypted:Draft message",
            );
            state.select("B");
            state.select("A");
            assert.equal(state.input.value, newer);
        }
    });
}

for (const failure of ["http", "transport", "full"]) {
    test(`failed ${failure} delivery retains its draft and permits explicit retry`, async () => {
        let blocked = true;
        const state = fixture(async () => {
            if (!blocked) return Response.json({ queued: true });
            if (failure === "http") return Response.json({}, { status: 500 });
            throw new Error(
                failure === "full"
                    ? "offline_outbox_full"
                    : "synthetic_transport",
            );
        });
        await state.submit();
        assert.equal(state.saved(), " Draft message ");
        assert.equal(state.toasts.length, 1);
        blocked = false;
        await state.submit();
        assert.equal(state.saved(), "");
        assert.equal(state.requests.length, 2);
    });
}

test("successful send followed by failed refresh is not a failed or retryable send", async () => {
    const state = fixture(async () => Response.json({ queued: true }), {
        refreshError: new Error("synthetic_refresh"),
    });
    await state.submit();
    assert.equal(state.saved(), "");
    assert.deepEqual(state.toasts, ["module.social.messages.refresh_failed"]);
    await state.submit();
    assert.equal(state.requests.length, 1);
});

test("a successful response with unreadable receipt still consumes only the submitted draft", async () => {
    const state = fixture(async () => ({
        ok: true,
        json: async () => {
            throw new Error("synthetic_json");
        },
    }));
    await state.submit();
    assert.equal(state.saved(), "");
    assert.deepEqual(state.toasts, ["module.social.messages.refresh_failed"]);
});

test("delivery while in another room neither navigates nor clears that room; original saved revision is consumed before return", async () => {
    const gate = deferred();
    const state = fixture(async () => {
        await gate.promise;
        return Response.json({ queued: true });
    });
    const pending = state.submit();
    await until(() => state.requests.length === 1);
    state.select("B");
    state.edit("B draft");
    gate.resolve();
    await pending;
    assert.equal(state.selected(), "B");
    assert.equal(state.saved(), "B draft");
    assert.deepEqual(state.refreshed, []);
    assert.equal(state.manager.loadPersistedFormState("A").size, 0);
    state.select("A");
    assert.equal(state.input.value, "");
});

test("leaving and returning during delivery preserves newer text for the original room", async () => {
    const gate = deferred();
    const state = fixture(async () => {
        await gate.promise;
        return Response.json({ queued: true });
    });
    const pending = state.submit();
    await until(() => state.requests.length === 1);
    state.select("B");
    state.edit("B draft");
    state.select("A");
    state.edit("A next draft");
    gate.resolve();
    await pending;
    assert.equal(state.saved(), "A next draft");
    state.select("B");
    assert.equal(state.saved(), "B draft");
});

for (const boundary of ["key", "encryption", "transport"]) {
    test(`disposed or replaced account prevents completion at ${boundary}`, async () => {
        const gate = deferred();
        let reached = false;
        const wait = async () => {
            reached = true;
            await gate.promise;
        };
        const state = fixture(
            async () => {
                if (boundary === "transport") await wait();
                return Response.json({ queued: true });
            },
            {
                key: async () => {
                    if (boundary === "key") await wait();
                    return {};
                },
                encrypt: async () => {
                    if (boundary === "encryption") await wait();
                    return { iv: "iv", ciphertext: "encrypted" };
                },
            },
        );
        const pending = state.submit();
        await until(() => reached);
        state.deactivate();
        gate.resolve();
        await pending;
        assert.equal(state.input.value, " Draft message ");
        assert.deepEqual(state.refreshed, []);
        assert.deepEqual(state.toasts, []);
        assert.equal(state.requests.length, boundary === "transport" ? 1 : 0);
    });
}
