import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("messages new-conversation search uses messaging lookup endpoint", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/app.js"),
        "utf8",
    );
    assert.match(source, /endpoint:\s*"\/api\/v1\/messages\/users\/lookup"/);
});

test("meetings search popup adds confirmed users directly to meeting participants", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/app.js"),
        "utf8",
    );
    assert.match(
        source,
        /onSelectMultiple:\s*\(results\)\s*=>[\s\S]*addParticipant\(participantEntry\)/,
    );
    assert.doesNotMatch(
        source,
        /onSelectMultiple:\s*\(results\)\s*=>[\s\S]*state\.availableParticipants\.push/,
    );
});

test("search popup selectable rows style checked state on the result entry", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/styles/reuse/search-bar.css"),
        "utf8",
    );
    assert.match(
        source,
        /\.search-popup-result--checked \.search-popup-result-checkbox\s*\{/,
    );
});

test("classes page redirects non-teachers back to dashboard", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/study/classes/ui/app.js"),
        "utf8",
    );
    assert.match(
        source,
        /if\s*\(!isTeacher\)\s*\{\s*navigateTo\("\/dashboard"\);/,
    );
});

test("mobile notification backdrop stays hidden until explicitly opened", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/notify/internal/ui/notifications.css"),
        "utf8",
    );
    assert.match(source, /\.notification-mobile-backdrop\[hidden\]\s*\{/);
    assert.match(
        source,
        /\.notification-mobile-backdrop:not\(\[hidden\]\)\s*\{/,
    );
});

test("hiragana component stylesheet does not override shared study sub-navigation layout", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/modules/study/languages/ja/components/hiragana-alphabet/ui/hiragana.css",
        ),
        "utf8",
    );
    assert.doesNotMatch(source, /\.study-page-subnav\s*\{/);
    assert.doesNotMatch(source, /\.study-subnav-modules\s*\{/);
    assert.doesNotMatch(source, /\.study-subnav-language-options\s*\{/);
});

test("study hub detects native library child component by descriptor id", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/study/ui/study.js"),
        "utf8",
    );
    assert.match(
        source,
        /hasLibraryModule[\s\S]*component\?\.id[\s\S]*===\s*"library"/,
    );
});

test("jitsi meeting group chats include the meeting date in their title", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/api/index.js"),
        "utf8",
    );
    assert.match(source, /function buildMeetingChatTitle[\s\S]*slice\(0, 10\)/);
    assert.match(source, /title:\s*meetingChatTitle/);
});

test("messages member count button opens a meeting presence summary popup", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/app.js"),
        "utf8",
    );
    assert.match(source, /id="messages-member-summary-btn"/);
    assert.match(
        source,
        /loadMeetingChatSummary[\s\S]*\/api\/v1\/modules\/jitsi-meet\/meetings\/chat-room-summary/,
    );
    assert.match(
        source,
        /openPopup\([\s\S]*module\.social\.messages\.present_users_title/,
    );
});

test("jitsi meeting window has light-theme overlay overrides", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/jitsi-meet.css"),
        "utf8",
    );
    assert.match(source, /body\[data-theme="light"\] \.jitsi-overlay\s*\{/);
    assert.match(source, /body\[data-theme="light"\] \.jitsi-spinner\s*\{/);
    assert.match(
        source,
        /body\[data-theme="light"\][\s\S]*\.jitsi-staged-participants[\s\S]*\.jitsi-participant-avatar-label\s*\{/,
    );
});
