import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { escapeHtml } from "../../../../ui/reuse/escape-html.js";
import { renderMarkdown } from "../../../../ui/reuse/markdown-renderer.js";
import * as cryptoUtils from "../../../../ui/reuse/crypto-utils.js";
import * as styleOptions from "../../../../ui/reuse/message-style-options.js";

const examples = JSON.parse(
    readFileSync(new URL("./fixtures/message-text.json", import.meta.url)),
);
const i18n = { t: (key) => key };

function createRenderer(style, theme, messageList) {
    const avatarRequests = [];
    const hydrated = [];
    const requests = [];
    const uiCtx = {
        capabilities: new Map([
            [
                "ui:profileAvatarRenderer",
                {
                    buildMarkup(options) {
                        avatarRequests.push(options);
                        return `<a class="${options.avatarClass}" href="/profile/${escapeHtml(options.profileHandle ?? "")}">${escapeHtml(options.label)}</a>`;
                    },
                    hydrate: (container) => hydrated.push(container),
                },
            ],
        ]),
    };
    const messageUtils = loadTestModule(
        new URL("../ui/message-utils.js", import.meta.url),
        {
            "/static/reuse/message-style-options.js": styleOptions,
            "/static/reuse/crypto-utils.js": cryptoUtils,
            "./emoji-helpers.js": { getCachedEmojiList: () => [] },
        },
        {
            crypto,
            TextEncoder,
            TextDecoder,
            Uint8Array,
            document: {
                documentElement: { dataset: { messageStyle: style } },
                body: { dataset: { theme } },
            },
        },
    );
    const commonImports = {
        "/static/reuse/ui-ctx.js": { uiCtx },
        "/static/reuse/escape-html.js": { escapeHtml },
        "/static/reuse/member-display-name.js": {
            resolveMemberDisplayName: (member) =>
                member.displayName || member.handle || member.accountId,
        },
        "./message-utils.js": messageUtils,
    };
    const roomRender = loadTestModule(
        new URL("../ui/room-render.js", import.meta.url),
        commonImports,
    );
    const renderer = loadTestModule(
        new URL("../ui/message-render.js", import.meta.url),
        {
            ...commonImports,
            "/static/reuse/markdown-renderer.js": { renderMarkdown },
            "/static/reuse/popup.js": {
                createAnchoredPopup: () => ({ hide() {}, destroy() {} }),
            },
            "/static/reuse/timestamp.js": {
                formatDate: (value) => value?.slice(0, 10) ?? "",
                formatTime: (value) => value?.slice(11, 16) ?? "",
            },
            "/static/reuse/search-util/popup.js": { registerSearchIndex() {} },
            "./emoji-helpers.js": { getQuickReactionEmojis: () => ["♥"] },
            "./room-render.js": roomRender,
            "./flows.js": {},
            "./offline-client.js": {
                messagesFetch: async (path) => {
                    requests.push(path);
                    return Response.json({
                        data: messageList,
                        pendingRequest: null,
                    });
                },
            },
        },
        { URLSearchParams },
    );
    return { ...renderer, ...messageUtils, avatarRequests, hydrated, requests };
}

function createThreadContainer() {
    return {
        innerHTML: "",
        scrollTop: 0,
        scrollHeight: 100,
        clientHeight: 100,
        querySelector: () => null,
        insertAdjacentHTML(position, markup) {
            assert.equal(position, "afterbegin");
            this.innerHTML = markup + this.innerHTML;
        },
    };
}

function readBodyMarkup(html) {
    const result = html.match(
        /<div class="(messages-message-body[^\"]*)">([\s\S]*?)<\/div>/,
    );
    assert.ok(result, "The thread contains a message body");
    assert.equal(
        result[1],
        "messages-message-body",
        "All text uses the width-constrained wrapping style",
    );
    return result[2];
}

for (const style of styleOptions.MESSAGE_STYLE_OPTIONS) {
    for (const theme of ["light", "dark"]) {
        for (const direction of ["incoming", "outgoing"]) {
            test(`${style} ${theme} ${direction} preserves wrapping content and surrounding controls`, async () => {
                const messageList = [];
                const fixture = createRenderer(style, theme, messageList);
                const key = await crypto.subtle.generateKey(
                    { name: "AES-GCM", length: 256 },
                    false,
                    ["encrypt", "decrypt"],
                );
                const container = createThreadContainer();
                const senderId =
                    direction === "outgoing"
                        ? "current-account"
                        : "other-account";
                for (const example of examples) {
                    const text = example.text.repeat(example.repeat ?? 1);
                    const encrypted = await fixture.encryptMessage(key, text);
                    messageList.splice(0, messageList.length, {
                        id: example.id,
                        senderId,
                        senderHandle: "sender",
                        senderDisplayName: "Sender",
                        createdAt: "2026-11-14T12:34:00.000Z",
                        ...encrypted,
                        reactions: [
                            { emoji: "♥", count: 1, reactedByMe: true },
                        ],
                        readBy: [
                            {
                                accountId: "reader",
                                handle: "reader",
                                displayName: "Reader",
                            },
                        ],
                    });
                    const result = await fixture.renderThread(
                        "room",
                        key,
                        container,
                        i18n,
                        "current-account",
                    );
                    assert.equal(result.changed, true);
                    assert.equal(
                        readBodyMarkup(container.innerHTML),
                        renderMarkdown(text, { softBreaks: true }),
                        example.id,
                    );
                    assert.match(
                        container.innerHTML,
                        /datetime="2026-11-14T12:34:00.000Z">12:34<\/time>/,
                    );
                    assert.match(
                        container.innerHTML,
                        /data-emoji="♥"[^>]*>♥ <span>1<\/span>/,
                    );
                    assert.match(
                        container.innerHTML,
                        /class="messages-message-bubble-avatar" href="\/profile\/sender"/,
                    );
                    assert.equal(
                        container.innerHTML.includes(
                            "messages-message-row--own",
                        ),
                        direction === "outgoing",
                    );
                    assert.equal(
                        container.innerHTML.includes(
                            "messages-message-status--read",
                        ),
                        direction === "outgoing",
                    );
                    const contentEnd = container.innerHTML.indexOf(
                        "</div>\n          </div>",
                    );
                    const metadataStart = container.innerHTML.indexOf(
                        '<span class="messages-message-meta">',
                    );
                    assert.equal(
                        metadataStart > contentEnd,
                        style === "speech_bubbles",
                        "Metadata retains its style-specific position",
                    );
                }
                assert.equal(fixture.hydrated.length, examples.length);
                assert.ok(
                    fixture.hydrated.every((target) => target === container),
                );
                assert.ok(
                    fixture.avatarRequests.some(
                        (options) =>
                            options.profileHandle === "sender" &&
                            options.showAvailability === false,
                    ),
                );
                assert.ok(
                    fixture.requests.every(
                        (path) =>
                            path ===
                            "/api/v1/social/messages/rooms/room/messages?limit=50",
                    ),
                );
                assert.equal(
                    (
                        await fixture.renderThread(
                            "room",
                            key,
                            container,
                            i18n,
                            "current-account",
                        )
                    ).changed,
                    false,
                );
                assert.equal(
                    (
                        await fixture.renderThread(
                            "room",
                            key,
                            container,
                            i18n,
                            "current-account",
                            undefined,
                            { force: true },
                        )
                    ).changed,
                    true,
                );
                const previousMarkup = container.innerHTML;
                await fixture.renderThread(
                    "room",
                    key,
                    container,
                    i18n,
                    "current-account",
                    "2026-11-13",
                );
                assert.equal(
                    container.innerHTML,
                    previousMarkup + previousMarkup,
                    "Earlier messages use the same wrapping path",
                );
            });
        }
    }
}

test("thread rendering preserves explicit breaks, safe Markdown and unavailable text", async () => {
    const messageList = [];
    const fixture = createRenderer("default", "light", messageList);
    const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
    );
    const text =
        "**Bold**\n<b>literal</b>\n[Safe](https://example.test) [Unsafe](javascript:alert%281%29)";
    messageList.push({
        id: "format",
        senderId: "other",
        ...(await fixture.encryptMessage(key, text)),
    });
    const container = createThreadContainer();
    await fixture.renderThread("room", key, container, i18n, "current");
    assert.equal(
        readBodyMarkup(container.innerHTML),
        '<p><strong>Bold</strong><br>&lt;b&gt;literal&lt;/b&gt;<br><a href="https://example.test" target="_blank" rel="noopener noreferrer">Safe</a> Unsafe</p>',
    );
    await fixture.renderThread(
        "room",
        null,
        container,
        i18n,
        "current",
        undefined,
        { force: true },
    );
    assert.equal(readBodyMarkup(container.innerHTML), "<p>…</p>");
});

test("message text styles preserve newlines, permit soft wrapping and constrain the body width", () => {
    const source = readFileSync(
        new URL("../ui/messages.css", import.meta.url),
        "utf8",
    );
    const declarations = source.match(
        /\.messages-message-body\s*\{([^}]+)\}/,
    )?.[1];
    assert.ok(declarations);
    for (const declaration of [
        "max-width: 100%",
        "white-space: pre-wrap",
        "word-break: break-word",
        "overflow-wrap: break-word",
    ]) {
        assert.ok(declarations.includes(declaration), declaration);
    }
});
