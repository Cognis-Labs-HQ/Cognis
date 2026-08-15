import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = process.cwd();

function readMessagesUiBundle() {
    const uiDir = resolve(ROOT, "src/adapters/social/messages/ui");
    return readdirSync(uiDir)
        .filter((entry) => entry.endsWith(".js") || entry.endsWith(".mjs"))
        .sort()
        .map((entry) => readFileSync(join(uiDir, entry), "utf8"))
        .join("\n");
}

test("messages asset registrations do not use query-string versioning", () => {
    const adapterSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/index.ts"),
        "utf8",
    );
    const htmlSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/index.html"),
        "utf8",
    );

    assert.doesNotMatch(adapterSource, /\?v=/);
    assert.doesNotMatch(htmlSource, /\?v=/);
});

test("meeting-linked chat reuse does not rename existing group chats", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/index.ts"),
        "utf8",
    );

    assert.match(source, /const existing =[\s\S]*findGroupByExactMembers/);
    assert.doesNotMatch(source, /updateRoomTitle\(existing\.id, title\)/);
});

test("meeting-linked chats record every resolved participant joining", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/index.ts"),
        "utf8",
    );
    const groupChatCapability =
        source.match(
            /social:messages:resolveGroupChatUrl[\s\S]*?social:messages:uiResources/,
        )?.[0] ?? "";

    assert.match(groupChatCapability, /for \(const accountId of accountIds\)/);
    assert.match(groupChatCapability, /addMemberWithEvent\(\{/);
    assert.match(groupChatCapability, /actorId: ownerAccountId/);
});

test("messages polling does not rerender for read timestamp churn", () => {
    const source = readMessagesUiBundle();
    const signatureBody =
        source.match(
            /function messageRenderSignature[\s\S]*?function roomListRenderSignature/,
        )?.[0] ?? "";

    assert.match(signatureBody, /accountId: reader\.accountId/);
    assert.doesNotMatch(signatureBody, /readAt: reader\.readAt/);
    assert.match(source, /if \(!force && !selectedRoomHasUnread\(\)\) return;/);
});

test("messages adapter ensures send-message flow before hook registration", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/index.ts"),
        "utf8",
    );

    assert.match(source, /if \(!ctx\.flow\.exists\("send-message"\)\)/);
    assert.match(source, /registerCanonicalFlow\(systemCtx, sendMessageFlow\)/);
    assert.match(
        source,
        /const persistHookRegistered = ctx\.flow\.extend\(\s*"send-message",\s*"persist-message"/,
    );
    assert.match(
        source,
        /const fanOutHookRegistered = ctx\.flow\.extend\(\s*"send-message",\s*"fan-out"/,
    );
    assert.match(source, /failed to register send-message persist hook/);
    assert.match(source, /failed to register send-message fan-out hook/);
});

test("messages avatars fall back after failed image loads", () => {
    const appSource = readMessagesUiBundle();
    const sharedSource = readFileSync(
        resolve(ROOT, "src/adapters/social/profile/ui/profile-avatar.js"),
        "utf8",
    );
    const gatewayExportSource = readFileSync(
        resolve(ROOT, "src/gateways/social/ui/reuse/profile-avatar.js"),
        "utf8",
    );

    assert.match(
        gatewayExportSource,
        /uiCtx\.capabilities\.get\("ui:profileAvatarRenderer"\)/,
    );
    assert.match(sharedSource, /const unavailableAvatarKeys = new Set\(\)/);
    assert.match(sharedSource, /unavailableAvatarKeys\.add\(avatarKey\)/);
    assert.match(sharedSource, /data-avatar-key=/);
    assert.match(sharedSource, /apiFetch\(buildAvatarFileUrl\(avatarKey\)\)/);
    assert.doesNotMatch(
        sharedSource,
        /src=\"\$\{escapeHtml\(buildAvatarFileUrl\(avatarKey\)\)\}/,
    );
    assert.match(appSource, /avatarKey: member\.avatarKey/);
    assert.match(
        appSource,
        /avatarKey: room\?\.avatarKey \|\| displayedMember\?\.avatarKey/,
    );
    assert.match(
        appSource,
        /root\.addEventListener\("error", handleProfileAvatarError/,
    );
    assert.match(
        appSource,
        /from "\/static\/gateways\/social\/reuse\/profile-avatar\.js"/,
    );
});

test("messages reaction chips render hover popup metadata and styles", () => {
    const appSource = readMessagesUiBundle();
    const stylesheetSource = readFileSync(
        resolve(
            ROOT,
            "src/adapters/social/messages/ui/messages-chat-shared.css",
        ),
        "utf8",
    );

    assert.match(appSource, /data-reaction-emoji-name=/);
    assert.match(appSource, /data-reacted-by=/);
    assert.match(appSource, /function showReactionHoverPopup/);
    assert.match(appSource, /createAnchoredPopup/);
    assert.doesNotMatch(
        appSource,
        /class="messages-reaction-chip[^"]*" title=/,
    );
    assert.match(
        readFileSync(
            resolve(ROOT, "src/adapters/social/messages/ui/messages.css"),
            "utf8",
        ),
        /@import url\("\/static\/adapters\/social\/messages\/messages-chat-shared\.css"\);/,
    );
    assert.match(stylesheetSource, /\.messages-reaction-hover-popup \{/);
    assert.match(stylesheetSource, /\.messages-reaction-hover-popup-users \{/);
});
