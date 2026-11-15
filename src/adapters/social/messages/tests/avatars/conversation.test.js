import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixture.js";

const record = {
    id: "synthetic-message",
    senderId: "synthetic-other",
    senderDisplayName: "The Firehawk",
    senderHandle: "le-firehawk",
    senderAvatarKey: "synthetic-avatar",
    text: "Synthetic message",
    createdAt: "2026-11-15T08:00:00Z",
    reactions: [],
    readBy: [],
};

for (const style of ["default", "speech_bubbles", "irc"]) {
    test(`${style} delegates conversation initials and size to the current Profile contract`, async (context) => {
        const state = await fixture(context);
        state.state.messages = [record];
        state.dom.window.document.documentElement.dataset.messageStyle = style;
        await state.messages.renderThread(
            "synthetic-room",
            null,
            state.root,
            state.i18n,
            "synthetic-self",
        );
        const content = state.avatars.calls.filter(
            (call) => call.operation === "content",
        );
        assert.equal(content.length, 2);
        for (const { options } of content) {
            assert.deepEqual(options.profile, {
                displayName: "The Firehawk",
                handle: "le-firehawk",
            });
            assert.equal(options.size, "small");
            assert.equal(options.avatarKey, "synthetic-avatar");
        }
        for (const link of state.root.querySelectorAll(
            ".messages-avatar-link",
        )) {
            assert.equal(link.getAttribute("href"), "/profile/le-firehawk");
            assert.equal(link.getAttribute("aria-label"), "The Firehawk");
            assert.equal(
                link.querySelector("[data-profile-avatar-size]").dataset
                    .profileAvatarSize,
                "small",
            );
        }
        assert.deepEqual(state.avatars.hydrated, [state.root]);
    });
}

test("read-only presentation uses the same profile contract without interactive avatars", async (context) => {
    const state = await fixture(context);
    state.root.innerHTML = await state.provider.render({
        records: [record],
        style: "speech_bubbles",
        currentAccountId: "synthetic-self",
    });
    assert.equal(
        state.root.querySelectorAll('[data-profile-avatar-size="small"]')
            .length,
        2,
    );
    assert.equal(
        state.root.querySelectorAll("a, img, [data-message-id]").length,
        0,
    );
    assert.ok(
        state.avatars.calls
            .filter((call) => call.operation === "content")
            .every(({ options }) => !options.avatarKey),
    );
    assert.equal(state.avatars.hydrated.length, 0);
    assert.equal(state.state.requests.length, 0);
});

test("canonical labels, profile links and account-only initials remain safely escaped", async (context) => {
    const state = await fixture(context);
    state.avatars.getPresentation = () => ({
        label: 'Canonical <Name> & "Label"',
        colorSeed: "provided-seed",
    });
    const input = {
        records: [
            {
                ...record,
                senderHandle: '@a/b"<c>',
                senderDisplayName: "<script>unsafe</script>",
            },
        ],
        style: "default",
        currentAccountId: "synthetic-self",
    };
    state.root.innerHTML = state.conversation.renderConversationMarkup(input, {
        avatars: state.avatars,
    });
    for (const link of state.root.querySelectorAll(".messages-avatar-link")) {
        assert.equal(link.getAttribute("href"), "/profile/a%2Fb%22%3Cc%3E");
        assert.equal(
            link.getAttribute("aria-label"),
            'Canonical <Name> & "Label"',
        );
    }
    assert.equal(state.root.querySelectorAll("script").length, 0);
    input.records = [
        {
            ...record,
            senderDisplayName: "",
            senderHandle: "",
            senderId: "account-only",
        },
    ];
    state.root.innerHTML = state.conversation.renderConversationMarkup(input, {
        avatars: state.avatars,
    });
    assert.equal(state.root.querySelectorAll("a").length, 0);
    assert.deepEqual(
        state.avatars.calls
            .filter((call) => call.operation === "content")
            .at(-1).options.profile,
        { displayName: "", handle: "account-only" },
    );
});

test("provider absence, incomplete contracts, disablement and return preserve preview readiness", async (context) => {
    const state = await fixture(context);
    const input = {
        records: [record],
        style: "default",
        currentAccountId: "synthetic-self",
    };
    state.avatars.available = false;
    assert.equal(state.provider.available, false);
    await assert.rejects(
        state.provider.render(input),
        /profile_avatar_presentation_unavailable/,
    );
    assert.throws(
        () =>
            state.conversation.renderConversationMarkup(input, {
                avatars: state.avatars,
            }),
        /profile_avatar_presentation_unavailable/,
    );
    assert.throws(
        () => state.conversation.renderConversationMarkup(input, {}),
        /profile_avatar_presentation_unavailable/,
    );
    state.avatars.available = true;
    const buildContent = state.avatars.buildContent;
    state.avatars.buildContent = undefined;
    assert.equal(state.provider.available, false);
    state.avatars.buildContent = buildContent;
    assert.equal(state.provider.available, true);
    assert.match(
        await state.provider.render(input),
        /data-profile-avatar-size="small"/,
    );
    await state.lifecycle.reconcile([]);
    assert.equal(state.provider.available, false);
    await assert.rejects(
        state.provider.render(input),
        (error) => error.name === "AbortError",
    );
});

test("renamed authors update fallback metadata without replacing selected message text", async (context) => {
    const state = await fixture(context);
    const { encryptMessage } = await import("../../ui/message-utils.js");
    const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
    );
    state.state.messages = [
        { ...record, ...(await encryptMessage(key, "Selected message body")) },
    ];
    const render = () =>
        state.messages.renderThread(
            "synthetic-room",
            key,
            state.root,
            state.i18n,
            "synthetic-self",
        );
    await render();
    const body = state.root.querySelector(
        ".messages-message-body p",
    ).firstChild;
    const selection = state.dom.window.document.getSelection();
    selection.setBaseAndExtent(body, 0, body, 8);
    state.state.messages[0].senderDisplayName = "Renamed Sender";
    await render();
    assert.equal(selection.anchorNode, body);
    assert.equal(selection.toString(), "Selected");
    for (const placeholder of state.root.querySelectorAll(
        "[data-avatar-key]",
    )) {
        assert.equal(placeholder.dataset.avatarKey, "synthetic-avatar");
        assert.equal(placeholder.dataset.avatarLabel, "Renamed Sender");
        assert.equal(placeholder.dataset.avatarColorSeed, "Renamed Sender");
    }
});

test("owner changes suppress pending conversation publication and avatar hydration", async (context) => {
    const state = await fixture(context);
    let resume;
    state.state.respond = () =>
        new Promise((resolve) => {
            resume = resolve;
        });
    const pending = state.messages.renderThread(
        "synthetic-room",
        null,
        state.root,
        state.i18n,
        "synthetic-self",
    );
    state.state.respond = null;
    state.state.messages = [
        { ...record, id: "current-message", senderId: "current-account" },
    ];
    await state.messages.renderThread(
        "current-room",
        null,
        state.root,
        state.i18n,
        "current-account",
    );
    resume(Response.json({ data: [record] }));
    assert.deepEqual(await pending, { obsolete: true });
    assert.ok(state.root.querySelector('[data-message-id="current-message"]'));
    assert.equal(state.avatars.hydrated.length, 1);
});
