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
    const source = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/app.js"),
        "utf8",
    );

    assert.match(source, /const unavailableAvatarKeys = new Set\(\)/);
    assert.match(source, /unavailableAvatarKeys\.add\(avatarKey\)/);
    assert.match(source, /data-avatar-key=/);
    assert.match(source, /apiFetch\(avatarFileSrc\(avatarKey\)\)/);
    assert.doesNotMatch(
        source,
        /src=\"\$\{escapeHtml\(avatarFileSrc\(avatarKey\)\)\}/,
    );
    assert.match(source, /avatarKey: member\.avatarKey/);
    assert.match(
        source,
        /avatarKey: room\?\.avatarKey \|\| displayedMember\?\.avatarKey/,
    );
    assert.match(
        source,
        /root\.addEventListener\("error", handleAvatarImageError/,
    );
});
