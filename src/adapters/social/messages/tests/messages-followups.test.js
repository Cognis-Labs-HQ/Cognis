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

test("messages new-conversation search uses messaging lookup endpoint", () => {
    const source = readMessagesUiBundle();
    assert.match(
        source,
        /endpoint:\s*"\/api\/v1\/social\/messages\/users\/lookup"/,
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
    const messagesCssSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/messages.css"),
        "utf8",
    );
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
    const messagesCssSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/messages.css"),
        "utf8",
    );
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
    const messagesCssSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/messages.css"),
        "utf8",
    );
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
    assert.match(
        appSource,
        /id="messages-composer" data-composer-exclude-form-memory="true"/,
    );
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
    let apiFetchCallCount = 0;
    const { resolveThreadRoomKey } = createRoomKeyStore({
        fetchRoomKey: async () => {
            apiFetchCallCount += 1;
            return {
                ok: true,
                status: 200,
                statusText: "OK",
                async json() {
                    return { data: { key: "00" } };
                },
            };
        },
    });

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
    assert.equal(apiFetchCallCount, 0);
});

test("requireRoomKey throws detailed errors on failure", async () => {
    const { requireRoomKey } = createRoomKeyStore({
        fetchRoomKey: async () => ({
            ok: false,
            status: 403,
            statusText: "Forbidden",
            async json() {
                return {
                    error: {
                        code: "forbidden",
                        message:
                            "Approve the message request before reading messages.",
                    },
                };
            },
        }),
    });

    await assert.rejects(
        () => requireRoomKey("room-403"),
        (error) => {
            assert.equal(
                error.message,
                "Approve the message request before reading messages.",
            );
            assert.equal(error.status, 403);
            assert.equal(error.code, "forbidden");
            assert.equal(error.roomId, "room-403");
            return true;
        },
    );
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

test("messages composer persists per-room drafts keyed by account and room", () => {
    const source = readMessagesUiBundle();

    assert.match(
        source,
        /MESSAGES_DRAFT_STORAGE_PREFIX = "cognis_messages_draft"/,
    );
    assert.match(
        source,
        /function getRoomDraftStorageKey\(accountId, roomId\)/,
    );
    assert.match(source, /function saveRoomDraft\(accountId, roomId, text\)/);
    assert.match(source, /function loadRoomDraft\(accountId, roomId\)/);
    assert.match(
        source,
        /`\$\{MESSAGES_DRAFT_STORAGE_PREFIX\}:\$\{accountId\}:\$\{roomId\}`/,
    );
});

test("messages composer saves draft on input and clears on successful send", () => {
    const source = readMessagesUiBundle();

    assert.match(
        source,
        /saveRoomDraft\(\s*currentAccountId,\s*roomState\.getSelectedRoomId\(\),\s*composerInput\.value,?\s*\)/m,
    );
    assert.match(
        source,
        /saveRoomDraft\(\s*currentAccountId,\s*selectedRoomId,\s*"",?\s*\)/m,
    );
});

test("messages onRoomOpened callback restores draft for opened room", () => {
    const source = readMessagesUiBundle();

    assert.match(
        source,
        /onRoomOpened:\s*async\s*\(room\)\s*=>\s*\{[\s\S]*loadRoomDraft\(\s*currentAccountId,\s*openedRoomId,?\s*\)/m,
    );
    assert.match(
        source,
        /const openedRoomId = room\?\.id != null \? String\(room\.id\) : null/,
    );
});
