import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRoomKeyStore } from "../ui/room-keys.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");

function readMessagesUiBundle() {
    const uiDir = resolve(ROOT, "src/adapters/social/messages/ui");
    return readdirSync(uiDir)
        .filter((entry) => entry.endsWith(".js") || entry.endsWith(".mjs"))
        .sort()
        .map((entry) => readFileSync(join(uiDir, entry), "utf8"))
        .join("\n");
}

function readMessagesCssBundle() {
    const uiDir = resolve(ROOT, "src/adapters/social/messages/ui");
    return ["messages.css", "thread.css"]
        .map((entry) => readFileSync(join(uiDir, entry), "utf8"))
        .join("\n");
}

test("all chat consumers use the adapter-owned key loading flow", () => {
    const source = readMessagesUiBundle();
    assert.match(source, /registerFlow\(FLOW_ID/);
    assert.match(source, /"resolve-keyring"/);
    assert.match(source, /"request-key-contribution"/);
    assert.match(source, /"persist-key-contribution"/);
    assert.match(source, /social:messages:loadChatRoomKey/);
    assert.doesNotMatch(source, /adapters\/auth\/keyring\/keyring\.js/);
});

test("messages new-conversation search uses messaging lookup endpoint", () => {
    const source = readMessagesUiBundle();
    assert.match(
        source,
        /endpoint:\s*"\/api\/v1\/social\/messages\/users\/lookup"/,
    );
});

test("messages sidebar separates pending requests from conversations", () => {
    const source = readMessagesUiBundle();
    assert.match(source, /const requestRooms = rooms\.filter/);
    assert.match(source, /module\.social\.messages\.requests_section/);
    assert.match(source, /!room\.pendingRequest/);
});

test("unread chats expose an animated alert state and complete title", () => {
    const renderSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/room-render.js"),
        "utf8",
    );
    const styleSource = readMessagesCssBundle();

    assert.match(renderSource, /messages-room--unread/);
    assert.match(renderSource, /title=\"\$\{escapeHtml\(titleSource\)\}\"/);
    assert.match(styleSource, /@keyframes messages-room-unread-pulse/);
    assert.match(
        styleSource,
        /\.messages-room--unread[\s\S]*border-radius: 0\.35rem/,
    );
    assert.match(styleSource, /prefers-reduced-motion: reduce/);
    assert.match(
        styleSource,
        /\.messages-room-title[\s\S]*text-overflow: ellipsis/,
    );
    assert.match(styleSource, /\.messages-unread-badge[\s\S]*--color-danger/);
});

test("room leave controls use explicit destructive button styling", () => {
    const renderSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/room-render.js"),
        "utf8",
    );
    const roomStateSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/room-state.js"),
        "utf8",
    );
    const englishStrings = readFileSync(
        resolve(
            ROOT,
            "src/adapters/social/messages/ui/languages/en/strings.xml",
        ),
        "utf8",
    );

    assert.match(renderSource, /messages-room-leave-btn btn-cancel/);
    const leaveButtonMarkup = renderSource.match(
        /<button id=\"messages-room-leave-btn\"[\s\S]*?<\/button>/,
    )?.[0];
    assert.ok(leaveButtonMarkup);
    assert.doesNotMatch(leaveButtonMarkup, /<svg/);
    assert.match(
        roomStateSource,
        /id: "confirm",[\s\S]*leave_room[\s\S]*variant: "cancel"/,
    );
    assert.match(englishStrings, />Leave Room</);
    assert.doesNotMatch(englishStrings, /Conversation/i);
});

test("messages omits availability lights from primary chat avatars", () => {
    const roomRenderSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/room-render.js"),
        "utf8",
    );
    const messageRenderSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/message-render.js"),
        "utf8",
    );

    assert.equal(
        roomRenderSource.match(/showAvailability:\s*false/g)?.length,
        2,
    );
    assert.equal(
        messageRenderSource.match(/showAvailability:\s*false/g)?.length,
        3,
    );
});

test("rejecting a request navigates away from the removed room", () => {
    const source = readMessagesUiBundle();
    assert.match(
        source,
        /await openFallbackAfterRoomRemoval\(roomIdHint \|\| selectedRoomId\)/,
    );
    assert.doesNotMatch(
        source,
        /if \(roomIdHint\) \{\s*await openRoom\(roomIdHint\)/,
    );
});

test("messages member count control opens local member summary without jitsi calls", () => {
    const source = readMessagesUiBundle();
    const memberSummaryPopupSource =
        source.match(
            /await openPopup\(\{[\s\S]*?module\.social\.messages\.member_summary_title[\s\S]*?maxWidth:\s*"560px",[\s\S]*?\}\);/,
        )?.[0] ?? "";

    assert.match(source, /id="messages-member-summary-btn"/);
    assert.doesNotMatch(
        source,
        /loadMeetingChatSummary[\s\S]*\/api\/v1\/modules\/jitsi-meet\/meetings\/chat-room-summary/,
    );
    assert.match(memberSummaryPopupSource, /onOpen:\s*\(overlay\)\s*=>/);
    assert.match(memberSummaryPopupSource, /handleProfileAvatarError/);
    assert.match(memberSummaryPopupSource, /hydrateProfileAvatars\(overlay\)/);
});

test("messages IRC layout keeps read receipts inline and centered", () => {
    const messagesCssSource = readMessagesCssBundle();
    const variantsCssSource = readFileSync(
        resolve(
            ROOT,
            "src/adapters/social/messages/ui/messages-style-variants.css",
        ),
        "utf8",
    );
    assert.match(
        messagesCssSource,
        /\.messages-message-status \.messages-avatar-link[\s\S]*align-items:\s*center;/,
    );
    assert.match(
        messagesCssSource,
        /\.messages-message-status \.messages-avatar-link[\s\S]*justify-content:\s*center;/,
    );
    assert.match(
        variantsCssSource,
        /\.messages-page\[data-message-style="irc"\] \.messages-message-row[\s\S]*display:\s*flex;[\s\S]*align-items:\s*baseline;/,
    );
    assert.match(
        variantsCssSource,
        /\.messages-page\[data-message-style="irc"\] \.messages-message-status[\s\S]*align-self:\s*center;/,
    );
    assert.match(
        messagesCssSource,
        /@import url\("\/static\/adapters\/social\/messages\/messages-style-variants\.css"\);/,
    );
});

test("messages speech bubbles remove tails and overlay avatars", () => {
    const variantsCssSource = readFileSync(
        resolve(
            ROOT,
            "src/adapters/social/messages/ui/messages-style-variants.css",
        ),
        "utf8",
    );
    assert.doesNotMatch(
        variantsCssSource,
        /\.messages-page\[data-message-style="speech_bubbles"\][\s\S]*\.messages-message::after/,
    );
    assert.match(
        variantsCssSource,
        /\.messages-page\[data-message-style="speech_bubbles"\][\s\S]*box-shadow:/,
    );
    assert.match(
        variantsCssSource,
        /\.messages-page\[data-message-style="speech_bubbles"\] \.messages-message-avatar[\s\S]*display:\s*none;/,
    );
    assert.match(
        variantsCssSource,
        /\.messages-page\[data-message-style="speech_bubbles"\][\s\S]*\.messages-message-bubble-avatar[\s\S]*display:\s*block;/,
    );
    assert.match(
        variantsCssSource,
        /\.messages-page\[data-message-style="speech_bubbles"\][\s\S]*\.messages-message:not\(\.messages-message--own\)[\s\S]*background:\s*var\(--color-surface-elevated\);[\s\S]*border:\s*1px solid var\(--color-border\);/,
    );
    assert.match(
        variantsCssSource,
        /\.messages-page\[data-message-style="speech_bubbles"\][\s\S]*\.messages-message--own[\s\S]*background:\s*var\(--color-accent\);[\s\S]*color:\s*var\(--color-accent-contrast\);/,
    );
});

test("messages reactions and receipts include advanced interaction safeguards", () => {
    const appSource = readMessagesUiBundle();
    const messagesCssSource = readMessagesCssBundle();
    const sharedCssSource = readFileSync(
        resolve(
            ROOT,
            "src/adapters/social/messages/ui/messages-chat-shared.css",
        ),
        "utf8",
    );
    const variantsCssSource = readFileSync(
        resolve(
            ROOT,
            "src/adapters/social/messages/ui/messages-style-variants.css",
        ),
        "utf8",
    );
    assert.match(appSource, /if \(hadPriorReaders\)\s*\{[\s\S]*?return "";/);
    assert.match(appSource, /data-reaction-details="1"/);
    assert.match(
        appSource,
        /threadList\?\.addEventListener\(\s*"focusin",[\s\S]*messages-message-status--read/,
    );
    assert.match(
        sharedCssSource,
        /\.messages-message-wrap \.messages-reaction-picker-row[\s\S]*position:\s*absolute;/,
    );
    assert.match(
        sharedCssSource,
        /\.messages-reactions-available[\s\S]*flex-wrap:\s*nowrap;/,
    );
    assert.match(
        sharedCssSource,
        /\.messages-read-receipt-popup[\s\S]*pointer-events:\s*none;/,
    );
    assert.match(
        messagesCssSource,
        /\.messages-message--own \.messages-message-meta[\s\S]*width:\s*100%;/,
    );
    assert.match(
        messagesCssSource,
        /\.messages-message-status--read[\s\S]*flex-direction:\s*row;/,
    );
    assert.match(
        messagesCssSource,
        /\.messages-page \.main-window--with-toolbar\s*\{[\s\S]*height:\s*min\(100%,\s*calc\(100dvh - 176px\)\);/,
    );
    assert.match(
        messagesCssSource,
        /@media \(max-width:\s*900px\)\s*\{[\s\S]*\.messages-page \.main-window--with-toolbar\s*\{[\s\S]*height:\s*min\(100%,\s*calc\(100dvh - 130px\)\);/,
    );
    assert.match(
        appSource,
        /function statusBadgeSvgMarkup\(includeDeliveredTick = false\)/,
    );
    assert.match(
        appSource,
        /<circle[\s\S]*cx="8"[\s\S]*cy="8"[\s\S]*r="5\.25"/,
    );
    assert.match(
        appSource,
        /statusSentSvgMarkup[\s\S]*<path d="M5\.25 8\.1L7\.15 10L10\.75 6\.5"/,
    );
    assert.match(
        appSource,
        /messages-reaction-details-reactor-emoji" title="\$\{escapeHtml\(emojiLabel\)\}" aria-label="\$\{escapeHtml\(emojiLabel\)\}"/,
    );
    assert.match(appSource, /hydrateProfileAvatars\(document\.body\)/);
    assert.match(
        variantsCssSource,
        /\.messages-page\[data-message-style="speech_bubbles"\][\s\S]*\.messages-reactions-row[\s\S]*max-width:\s*100%;/,
    );
});

test("messages templates are opened from sidebar in a popup", () => {
    const appSource = readMessagesUiBundle();
    const messagesCssSource = readMessagesCssBundle();
    const templatesCssSource = readFileSync(
        resolve(
            ROOT,
            "src/adapters/social/messages/ui/messages-template-composer.css",
        ),
        "utf8",
    );
    const sidebarCssSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/messages-sidebar.css"),
        "utf8",
    );

    assert.match(appSource, /id="messages-composer-compose-toggle"/);
    assert.match(appSource, /id="messages-composer-preview-toggle"/);
    assert.match(appSource, /id="messages-open-templates-btn"/);
    assert.match(appSource, /id="messages-composer-preview-pane"/);
    assert.match(appSource, /id="messages-composer-preview"/);
    assert.match(
        appSource,
        /async function openTemplatesPopup\(preloadTemplateId = null\)/,
    );
    assert.match(
        appSource,
        /await openPopup\(\{[\s\S]*title:\s*i18n\.t\("module\.social\.messages\.templates"\)/,
    );
    assert.match(appSource, /id="messages-template-editor"/);
    assert.match(appSource, /data-template-token="\{username\}"/);
    assert.match(appSource, /data-template-token="\{displayName\}"/);
    assert.match(appSource, /function renderComposerPreviewMarkup/);
    assert.match(appSource, /function resolveMessageTemplateVariables/);
    assert.match(appSource, /module\.social\.messages\.preview_placeholder/);
    assert.match(
        appSource,
        /composerComposeToggle\?\.addEventListener\("click",[\s\S]*composerMode = "compose";/,
    );
    assert.match(
        appSource,
        /composerPreviewToggle\?\.addEventListener\("click",[\s\S]*composerMode = "preview";/,
    );
    assert.match(
        appSource,
        /templatesButton\?\.addEventListener\("click",[\s\S]*templateUi\.openTemplatesPopup/,
    );
    assert.match(
        appSource,
        /resolveMessageTemplateVariables\([\s\S]*currentRoom[\s\S]*currentAccountId/,
    );
    assert.match(appSource, /id="messages-sidebar-template-list"/);
    assert.match(appSource, /data-template-action="use"/);
    assert.match(appSource, /data-template-action="edit"/);
    assert.match(appSource, /data-template-action="delete"/);
    assert.match(messagesCssSource, /\.messages-composer-mode-toggle\s*\{/);
    assert.match(
        messagesCssSource,
        /\.messages-composer-mode-row\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/,
    );
    assert.match(sidebarCssSource, /\.messages-sidebar-menu-btn\s*\{/);
    assert.match(
        sidebarCssSource,
        /\.messages-sidebar-section-label--btn\s*\{/,
    );
    assert.match(sidebarCssSource, /\.messages-sidebar-template-list\s*\{/);
    assert.match(
        sidebarCssSource,
        /\.messages-sidebar-template-load-btn\s*\{[\s\S]*flex:\s*1;/,
    );
    assert.match(messagesCssSource, /\.messages-composer-preview\s*\{/);
    assert.match(
        messagesCssSource,
        /@import url\("\/static\/adapters\/social\/messages\/messages-template-composer\.css"\);/,
    );
    assert.match(
        messagesCssSource,
        /@import url\("\/static\/adapters\/social\/messages\/messages-sidebar\.css"\);/,
    );
    assert.match(
        templatesCssSource,
        /\.messages-template-card\s*\{[\s\S]*display:\s*flex;[\s\S]*align-items:\s*center;/,
    );
    assert.match(
        templatesCssSource,
        /\.messages-template-card-actions\s*\{[\s\S]*flex-shrink:\s*0;/,
    );
});

test("messages UI skips room-key fetch for incoming pending requests", async () => {
    const { resolveThreadRoomKey } = createRoomKeyStore();

    const key = await resolveThreadRoomKey(
        {
            pendingRequest: {
                direction: "incoming",
                canRespond: true,
            },
        },
        "room-1",
    );

    assert.equal(key, null);
});

test("requireRoomKey reports a missing keyring secret", async () => {
    const { requireRoomKey } = createRoomKeyStore();

    await assert.rejects(
        () => requireRoomKey("room-403"),
        (error) => {
            assert.equal(
                error.message,
                "Room key is unavailable in the keyring.",
            );
            assert.equal(error.code, "missing_keyring_secret");
            assert.equal(error.roomId, "room-403");
            return true;
        },
    );
});

test("room keys use keyring resolution and refresh invalid secrets", async () => {
    const imported = { type: "secret" };
    let invalidRoomId = null;
    const { getRoomKey } = createRoomKeyStore({
        importKey: async (hex) => {
            assert.equal(hex, "current-key");
            return imported;
        },
        resolveSecret: async (id, options) => {
            assert.equal(id, "chatroom:room-1:key");
            assert.deepEqual(options.request, {
                action: "open",
                process: "chat room-1",
            });
            options.onInvalid();
            return "current-key";
        },
        buildRequest: async (roomId) => ({
            action: "open",
            process: `chat ${roomId}`,
        }),
        onInvalidSecret: (roomId) => {
            invalidRoomId = roomId;
        },
    });
    assert.equal(await getRoomKey("room-1"), imported);
    assert.equal(invalidRoomId, "room-1");
});

test("room keys reject a valid but non-authoritative stored key", async () => {
    const validStoredKey = "a".repeat(64);
    const authoritativeKey = "b".repeat(64);
    let validationResult = true;
    const store = createRoomKeyStore({
        importKey: async (value) => value,
        resolveSecret: async (_id, options) => {
            validationResult = await options.validate(validStoredKey);
            return validationResult
                ? validStoredKey
                : options.fallback({ invalid: true });
        },
    });

    const key = await store.getRoomKey("room-1", {
        id: "chatroom:room-1:key",
        value: authoritativeKey,
    });

    assert.equal(validationResult, false);
    assert.equal(key, authoritativeKey);
});

test("server room key contributions are validated and saved to the keyring", async () => {
    const saved = [];
    const imported = { type: "secret" };
    const { contributeRoomKey, requireRoomKey } = createRoomKeyStore({
        importKey: async (hex) => {
            assert.equal(hex, "generated-room-key");
            return imported;
        },
        contributeSecret: async (...args) => saved.push(args),
    });

    assert.equal(
        await contributeRoomKey("room-1", {
            id: "chatroom:room-1:key",
            value: "generated-room-key",
            metadata: { label: "Chat room-1" },
        }),
        true,
    );
    assert.deepEqual(saved, [
        ["chatroom:room-1:key", "generated-room-key", { label: "Chat room-1" }],
    ]);
    assert.equal(await requireRoomKey("room-1"), imported);
});

test("destroying the keyring clears cached room keys", async () => {
    const imported = { type: "secret" };
    const store = createRoomKeyStore({
        importKey: async () => imported,
        contributeSecret: async () => undefined,
    });
    await store.contributeRoomKey("room-1", {
        id: "chatroom:room-1:key",
        value: "generated-room-key",
    });

    store.clearRoomKeys();

    await assert.rejects(
        () => store.requireRoomKey("room-1"),
        (error) => error.code === "missing_keyring_secret",
    );
});

test("missing previously delivered room keys fall through to manual entry", async () => {
    const store = createRoomKeyStore({
        importKey: async (value) => value,
        resolveSecret: async (_id, options) => options.prompt?.(),
        promptSecret: async () => "manually-supplied-key",
    });

    assert.equal(await store.getRoomKey("room-1"), null);
    assert.equal(
        await store.getRoomKey("room-1", null, true),
        "manually-supplied-key",
    );
});

test("messages unlock the keyring before accepting a delivered room key", () => {
    const source = readMessagesUiBundle();

    assert.match(source, /"resolve-keyring"/);
    assert.match(source, /"request-key-contribution"/);
    assert.match(source, /keyring:isUnlocked/);
    assert.match(source, /recoverMissing !== true/);
    assert.match(source, /\/key-contribution/);
    assert.match(source, /event\.detail\?\.type !== "destroy"/);
    assert.match(source, /roomKeys\.clearRoomKeys\(\)/);
    assert.match(source, /keyringScopeFactory\?\.\("Social Messages"\)/);
    assert.match(source, /roomKeys\.contributeRoomKey/);
    assert.doesNotMatch(source, /auth:createRepromptGuard/);
});

test("messages refresh encrypted previews after a contextual keyring unlock", () => {
    const source = readMessagesUiBundle();

    assert.match(source, /"cognis:keyring-event"/);
    assert.match(source, /event\.detail\?\.type === "unlock"/);
    assert.match(source, /event\.detail\?\.type === "write"/);
    assert.match(source, /\.startsWith\("chatroom:"\)/);
    assert.match(source, /await roomState\.reloadRoomsList\(\)/);
    assert.match(source, /await roomState\.refreshActiveConversation\(\)/);
});

test("messages pause refresh polling until room-key setup completes", () => {
    const source = readMessagesUiBundle();

    assert.match(source, /openingRoomId === roomId && roomOpenPromise/);
    assert.match(source, /readyRoomId !== selectedRoomId\) return/);
    assert.match(source, /const key = await getRoomKey\(selectedRoomId\)/);
    const refreshBlock = source.match(
        /async function refreshActiveConversation\(\)[\s\S]*?function startTypingPolling/,
    )?.[0];
    assert.ok(refreshBlock);
    assert.doesNotMatch(refreshBlock, /requireRoomKey/);
    assert.match(source, /keyring:isAccessSuppressed/);
    assert.match(source, /cognis:keyring-access-state/);
    assert.match(source, /handleKeyringAccessState/);
});

test("messages saved templates are scoped to the current account", () => {
    const source = readMessagesUiBundle();

    assert.match(source, /function loadSavedMessageTemplates\(accountId\)/);
    assert.match(
        source,
        /function persistSavedMessageTemplates\(templates, accountId\)/,
    );
    assert.match(source, /function templateStorageKey\(accountId\)/);
    assert.match(
        source,
        /`\$\{MESSAGE_TEMPLATES_STORAGE_KEY\}:\$\{accountId\}`/,
    );
    assert.match(source, /loadSavedMessageTemplates\(currentAccountId\)/);
    assert.match(
        source,
        /persistSavedMessageTemplates\(\s*savedMessageTemplates,\s*currentAccountId,?\s*\)/m,
    );
});

test("messages composer persists per-room drafts via form-draft manager keyed by room", () => {
    const source = readMessagesUiBundle();

    assert.match(
        source,
        /createFormDraftManager\(\{[^}]*FORM_DRAFT_STORAGE_PREFIX:\s*"cognis_messages_draft"/m,
    );
    assert.match(source, /data-composer-include-form-memory="true"/);
    assert.match(source, /captureFormState\b/);
    assert.match(source, /restoreFormState\b/);
});

test("messages composer saves draft on input and clears on successful send", () => {
    const source = readMessagesUiBundle();

    assert.match(
        source,
        /savePersistedFormState\(\s*selectedRoomId,\s*captureFormState\(root,\s*\{[^}]*persistableOnly:\s*true[^}]*\}\)/m,
    );
    assert.match(source, /clearPersistedFormState\(\s*selectedRoomId\s*\)/m);
});

test("messages onRoomOpened callback restores draft for opened room", () => {
    const source = readMessagesUiBundle();

    assert.match(
        source,
        /const openedRoomId = room\?\.id != null \? String\(room\.id\) : null/,
    );
    assert.match(
        source,
        /const persistedState = loadPersistedFormState\(\s*openedRoomId\s*\)/,
    );
    assert.match(source, /restoreFormState\(\s*root,\s*persistedState\s*\)/);
    assert.match(source, /composerInputRef\?\.dispatchEvent/);
});

test("messages onRoomOpened clears composer when opened room has no saved draft", () => {
    const source = readMessagesUiBundle();

    assert.match(
        source,
        /persistedState\.size === 0[\s\S]*composerInputRef instanceof HTMLTextAreaElement/m,
    );
    assert.match(
        source,
        /persistedState\.size === 0[\s\S]*composerInputRef\.value = ""/m,
    );
});

test("messages serialize concurrent room-key loads during SPA mounting", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/chat-loading.js"),
        "utf8",
    );

    assert.match(source, /const pendingRoomKeyLoads = new Map\(\)/);
    assert.match(
        source,
        /const existingLoad = pendingRoomKeyLoads\.get\(loadId\)/,
    );
    assert.match(source, /recoverMissing \? "recover" : "local"/);
    assert.match(source, /if \(existingLoad\) \{\s*return existingLoad;/);
});

test("keyring reset preserves message-room membership", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/index.ts"),
        "utf8",
    );

    assert.doesNotMatch(source, /auth:registerKeyringDataOwner/);
    assert.match(source, /auth:registerAccountDataOwner/);
});
