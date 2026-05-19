import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();

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

test("messages polling does not rerender for read timestamp churn", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/app.js"),
        "utf8",
    );
    const signatureBody =
        source.match(
            /function messageRenderSignature[\s\S]*?function roomListRenderSignature/,
        )?.[0] ?? "";

    assert.match(signatureBody, /accountId: reader\.accountId/);
    assert.doesNotMatch(signatureBody, /readAt: reader\.readAt/);
    assert.match(source, /if \(!force && !selectedRoomHasUnread\(\)\) return;/);
});

test("messages avatars fall back after failed image loads", () => {
    const appSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/app.js"),
        "utf8",
    );
    const sharedSource = readFileSync(
        resolve(ROOT, "src/gateways/social/ui/reuse/profile-avatar.js"),
        "utf8",
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
    const appSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/app.js"),
        "utf8",
    );
    const stylesheetSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/messages.css"),
        "utf8",
    );

    assert.match(appSource, /data-reaction-emoji-name=/);
    assert.match(appSource, /data-reacted-by=/);
    assert.match(appSource, /function showReactionHoverPopup/);
    assert.doesNotMatch(
        appSource,
        /class="messages-reaction-chip\$\{ownClass\}" title=/,
    );
    assert.match(stylesheetSource, /\.messages-reaction-hover-popup \{/);
    assert.match(stylesheetSource, /\.messages-reaction-hover-popup-users \{/);
});
