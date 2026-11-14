import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { uiCtx } from "../../../../ui/reuse/ui-ctx.js";
import { createProviderLifecycle } from "../../../../ui/reuse/provider-lifecycle.js";
import * as styleOptions from "../../../../ui/reuse/message-style-options.js";
import { escapeHtml } from "../../../../ui/reuse/escape-html.js";
import { loadPresentation } from "./fixtures/presentation.js";

const input = {
    currentAccountId: "outgoing",
    style: "default",
    records: ["incoming", "outgoing", "incoming"].map((senderId, index) => ({
        id: `sample-${index}`,
        senderId,
        senderDisplayName: `Sample ${senderId}`,
        senderHandle: `sample_${senderId}`,
        text: "A synthetic message with **emphasis**.\nA second line.",
        createdAt: `2026-01-15T14:3${index}:00.000Z`,
    })),
};

async function fixture(context, { avatarInitially = true } = {}) {
    const dom = new JSDOM("<main></main>");
    const avatarCalls = [];
    const errors = [];
    const avatars = {
        available: true,
        buildMarkup: (options) => {
            avatarCalls.push(options);
            return `<span class="${options.avatarClass}"><span class="${options.fallbackClass}">${escapeHtml(options.label)}</span></span>`;
        },
    };
    if (avatarInitially)
        uiCtx.capabilities.contribute("ui:profileAvatarRenderer", avatars);
    const module = loadTestModule(
        new URL("../ui/presentation-provider.js", import.meta.url),
        {
            "/static/reuse/message-style-options.js": styleOptions,
            "./reuse/conversation-presentation.js": loadPresentation(),
        },
        {
            document: dom.window.document,
            window: dom.window,
            Event: dom.window.Event,
            fetch: () => assert.fail("presentation must not fetch"),
            localStorage: {
                getItem: () =>
                    assert.fail("presentation must not read identity"),
                setItem: () => assert.fail("presentation must not persist"),
            },
        },
    );
    const lifecycle = createProviderLifecycle({
        uiCtx,
        importProvider: async () => module,
        onFailure: (failure) => errors.push(failure),
    });
    const catalog = [
        {
            scriptUrl:
                "/static/adapters/social/messages/presentation-provider.js",
            component: {
                type: "adapter",
                gatewayId: "social",
                id: "social-messages",
                version: "2.8.1",
            },
        },
    ];
    await lifecycle.reconcile(catalog);
    context.after(async () => {
        await lifecycle.reconcile([]);
        uiCtx.capabilities.remove("ui:profileAvatarRenderer", avatars);
        dom.window.close();
    });
    return {
        dom,
        lifecycle,
        catalog,
        avatarCalls,
        avatars,
        errors,
        provider: uiCtx.capabilities.get("social:messagePresentation"),
    };
}

test("registered provider executes its real validation/render stages for every style", async (context) => {
    const state = await fixture(context);
    const stages = [];
    uiCtx.extendFlow(
        "messages:presentConversation",
        "validate",
        { id: "test:validate", order: 1 },
        () => stages.push("validate"),
    );
    uiCtx.extendFlow(
        "messages:presentConversation",
        "render",
        { id: "test:render", order: 1 },
        () => stages.push("render"),
    );
    const root = state.dom.window.document.querySelector("main");
    for (const style of styleOptions.MESSAGE_STYLE_OPTIONS) {
        root.innerHTML = await state.provider.render({ ...input, style });
        assert.equal(root.querySelectorAll(".messages-message-row").length, 3);
        assert.equal(
            root.querySelectorAll(".messages-message-row--own").length,
            1,
        );
        assert.equal(root.querySelector("time").textContent, "14:30");
        assert.equal(
            root.querySelectorAll(
                "a, button, input, [data-message-id], [data-search-text], [data-reaction-slot]",
            ).length,
            0,
        );
        assert.ok(root.querySelector(".messages-message-body strong"));
        const message = root.querySelector(".messages-message");
        assert.equal(
            Boolean(message.querySelector(".messages-message-meta")),
            style !== "speech_bubbles",
        );
    }
    assert.deepEqual(stages, [
        "validate",
        "render",
        "validate",
        "render",
        "validate",
        "render",
    ]);
    assert.ok(
        state.avatarCalls.every(
            (options) =>
                options.avatarKey === null &&
                options.profileHandle === null &&
                options.showAvailability === false,
        ),
    );
    assert.deepEqual(state.errors, []);
});

test("presentation rejects malformed input and strips rich content actions", async (context) => {
    const state = await fixture(context);
    for (const invalid of [
        { ...input, style: "unknown" },
        { ...input, records: [{}] },
    ]) {
        await assert.rejects(
            state.provider.render(invalid),
            /invalid_message_presentation/,
        );
    }
    const markup = await state.provider.render({
        ...input,
        records: [
            {
                ...input.records[0],
                text: "[Link](https://example.test)\n\n```js\ncode\n```",
            },
        ],
    });
    const template = state.dom.window.document.createElement("template");
    template.innerHTML = markup;
    assert.equal(
        template.content.querySelectorAll("a,button,img,iframe").length,
        0,
    );
    assert.match(template.content.textContent, /Link/);
});

test("provider removal revokes retained capability and flow, then reactivation works", async (context) => {
    const state = await fixture(context);
    const retained = state.provider;
    await state.lifecycle.reconcile([]);
    assert.equal(
        uiCtx.capabilities.get("social:messagePresentation"),
        undefined,
    );
    assert.equal(uiCtx.flowExists("messages:presentConversation"), false);
    await assert.rejects(
        retained.render(input),
        (error) => error.name === "AbortError",
    );
    await state.lifecycle.reconcile(state.catalog);
    const current = uiCtx.capabilities.get("social:messagePresentation");
    assert.notEqual(current, retained);
    assert.match(await current.render(input), /messages-message-body/);
});

test("capability conflict rolls back owned flow without removing the existing provider", async (context) => {
    const existing = { version: 1 };
    uiCtx.capabilities.contribute("social:messagePresentation", existing);
    context.after(() =>
        uiCtx.capabilities.remove("social:messagePresentation", existing),
    );
    const state = await fixture(context);
    assert.equal(
        uiCtx.capabilities.get("social:messagePresentation"),
        existing,
    );
    assert.equal(uiCtx.flowExists("messages:presentConversation"), false);
    assert.equal(state.errors.length, 1);
});

test("provider styles reuse message wrapping, themed variants and date dividers", async (context) => {
    const state = await fixture(context);
    const document = state.dom.window.document;
    for (const path of state.provider.stylesheets) {
        const style = document.createElement("style");
        style.textContent = readFileSync(
            new URL(`../ui/${path.split("/").at(-1)}`, import.meta.url),
            "utf8",
        );
        document.head.appendChild(style);
    }
    const root = document.querySelector("main");
    root.className = "messages-page";
    for (const theme of ["light", "dark"]) {
        document.body.dataset.theme = theme;
        for (const style of styleOptions.MESSAGE_STYLE_OPTIONS) {
            root.dataset.messageStyle = style;
            root.innerHTML = await state.provider.render({ ...input, style });
            const computed = (selector) =>
                state.dom.window.getComputedStyle(root.querySelector(selector));
            assert.equal(
                computed(".messages-message-body").whiteSpace,
                "pre-wrap",
            );
            assert.equal(computed(".messages-date-divider").display, "flex");
            assert.equal(computed(".messages-message-wrap").minWidth, "0px");
            assert.equal(
                computed(".messages-message-handle").display,
                style === "irc" ? "inline" : "none",
            );
        }
    }
});

const notifyAvatars = (state) =>
    state.dom.window.dispatchEvent(
        new state.dom.window.Event("cognis:profile-avatar-renderer-changed"),
    );

test("presentation version two reports missing dependency and relays its return and revocation", async (context) => {
    const state = await fixture(context, { avatarInitially: false });
    assert.equal(state.provider.version, 2);
    assert.equal(state.provider.available, false);
    await assert.rejects(
        state.provider.render(input),
        /profile_avatar_presentation_unavailable/,
    );
    const readiness = [];
    state.dom.window.addEventListener(
        "cognis:message-presentation-changed",
        () => readiness.push(state.provider.available),
    );
    uiCtx.capabilities.contribute("ui:profileAvatarRenderer", state.avatars);
    notifyAvatars(state);
    assert.equal(state.provider.available, true);
    assert.match(await state.provider.render(input), /messages-message-body/);
    state.avatars.available = false;
    notifyAvatars(state);
    assert.equal(state.provider.available, false);
    state.avatars.available = true;
    notifyAvatars(state);
    assert.deepEqual(readiness, [true, false, true]);
    await state.lifecycle.reconcile([]);
    const afterRemoval = readiness.length;
    notifyAvatars(state);
    assert.equal(
        readiness.length,
        afterRemoval,
        "removed Messages owner no longer relays Profile notifications",
    );
});

test("dependency revocation invalidates pending presentation even after same-object reactivation", async (context) => {
    const state = await fixture(context);
    let resume;
    const pending = new Promise((resolve) => {
        resume = resolve;
    });
    let block = true;
    uiCtx.extendFlow(
        "messages:presentConversation",
        "validate",
        { id: "test:pendingDependency", order: 10 },
        () => {
            if (block) {
                block = false;
                return pending;
            }
        },
    );
    const obsolete = state.provider.render(input);
    const rejected = assert.rejects(
        obsolete,
        /profile_avatar_presentation_unavailable/,
    );
    await new Promise((resolve) => setImmediate(resolve));
    state.avatars.available = false;
    notifyAvatars(state);
    state.avatars.available = true;
    notifyAvatars(state);
    assert.match(await state.provider.render(input), /messages-message-body/);
    resume();
    await rejected;
});
