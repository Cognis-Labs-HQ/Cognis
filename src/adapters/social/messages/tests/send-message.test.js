import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";

function fixture(send) {
    class TextArea {
        value = " Draft message ";
    }
    const input = new TextArea();
    const toasts = [];
    const cleared = [];
    const opened = [];
    const { createMessageSender } = loadTestModule(
        new URL("../ui/send-message.js", import.meta.url),
        {
            "./offline-client.js": { messagesFetch: send },
            "./message-utils.js": {
                encryptMessage: async (_key, text) => ({
                    ciphertext: `encrypted:${text}`,
                    iv: "iv",
                }),
            },
            "./message-templates.js": {
                resolveMessageTemplateVariables: (value) => value,
            },
            "/static/reuse/toast.js": {
                showToast: (text) => toasts.push(text),
            },
        },
        { HTMLTextAreaElement: TextArea, console },
    );
    const handler = createMessageSender({
        roomState: {
            getSelectedRoomId: () => "room",
            getSelectedRoom: () => ({ canSend: true }),
            queueTypingUpdate: () => {},
            openRoom: async (id) => opened.push(id),
            refreshTypingIndicator: () =>
                assert.fail("queued messages do not restart typing"),
            startLiveRefreshPolling: () =>
                assert.fail("queued messages do not start network polling"),
        },
        composerInput: input,
        currentAccountId: "learner",
        requireRoomKey: async () => ({}),
        clearPersistedFormState: (id) => cleared.push(id),
        renderComposerPreview: () => {},
        i18n: { t: (key) => key },
    });
    return {
        input,
        toasts,
        cleared,
        opened,
        submit: () => handler(new Event("submit", { cancelable: true })),
    };
}

test("the draft remains until durable submission finishes and repeated submit cannot duplicate it", async () => {
    let finish;
    let start;
    const started = new Promise((resolve) => {
        start = resolve;
    });
    const acknowledgement = new Promise((resolve) => {
        finish = resolve;
    });
    let calls = 0;
    const state = fixture(async (_path, options) => {
        calls++;
        assert.equal(
            JSON.parse(options.body).ciphertext,
            "encrypted:Draft message",
        );
        start();
        await acknowledgement;
        return Response.json({ queued: true }, { status: 202 });
    });
    const sending = state.submit();
    await started;
    await state.submit();
    assert.equal(calls, 1);
    assert.equal(state.input.value, " Draft message ");
    assert.deepEqual(state.cleared, []);
    finish();
    await sending;
    assert.equal(state.input.value, "");
    assert.deepEqual(state.cleared, ["room"]);
    assert.deepEqual(state.opened, ["room"]);
    assert.deepEqual(state.toasts, ["ui.reuse.offline_changes_queued"]);
});

test("a full buffer retains the message draft and allows retry after recovery", async () => {
    let blocked = true;
    const state = fixture(async () => {
        if (blocked) throw new Error("offline_outbox_full");
        return Response.json({ queued: true });
    });
    await state.submit();
    assert.equal(state.input.value, " Draft message ");
    assert.deepEqual(state.cleared, []);
    assert.deepEqual(state.toasts, ["ui.reuse.offline_buffer_full_body"]);
    blocked = false;
    await state.submit();
    assert.equal(state.input.value, "");
    assert.deepEqual(state.cleared, ["room"]);
});
