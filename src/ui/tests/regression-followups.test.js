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

test("messages member count control opens local member summary without jitsi calls", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/app.js"),
        "utf8",
    );
    assert.match(source, /id="messages-member-summary-btn"/);
    assert.doesNotMatch(
        source,
        /loadMeetingChatSummary[\s\S]*\/api\/v1\/modules\/jitsi-meet\/meetings\/chat-room-summary/,
    );
    assert.match(
        source,
        /openPopup\([\s\S]*module\.social\.messages\.member_summary_title/,
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

test("meetings page composer uses a dedicated layout preference key", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/app.js"),
        "utf8",
    );
    assert.match(source, /preferenceKey:\s*"meetings-layout-v2"/);
});

test("jitsi meetings embed enforces subject, theme, password, and reduced toolbar", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/app.js"),
        "utf8",
    );
    assert.match(source, /const MEETING_SUBJECT = "Cognis Classroom";/);
    const toolbarArrayMatch = source.match(
        /const JITSI_TOOLBAR_BUTTONS = \[([\s\S]*?)\];/,
    );
    assert.ok(toolbarArrayMatch);
    const toolbarArraySource = toolbarArrayMatch[1];
    assert.equal(/"chat"/.test(toolbarArraySource), false);
    assert.equal(/"invite"/.test(toolbarArraySource), false);
    assert.equal(/"settings"/.test(toolbarArraySource), false);
    assert.match(source, /subject: MEETING_SUBJECT,/);
    assert.match(source, /executeCommand\("subject", MEETING_SUBJECT\)/);
    assert.match(source, /preferredTheme: themeMode,/);
    assert.match(
        source,
        /hashParams\.set\("config\.subject", MEETING_SUBJECT\)/,
    );
    assert.match(
        source,
        /hashParams\.set\("config\.preferredTheme", themeMode\)/,
    );
    assert.match(source, /executeCommand\("password", meetingPassword\);/);
    assert.match(source, /addEventListener\("passwordRequired", \(\) => \{/);
});

test("jitsi meetings lock participants and block navigation while meeting is active", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/app.js"),
        "utf8",
    );
    assert.match(source, /function isMeetingActive\(\)/);
    assert.match(source, /jitsi-participants-disabled/);
    assert.match(
        source,
        /window\.addEventListener\(\s*"beforeunload"[\s\S]*event\.returnValue = "";/,
    );
    assert.match(
        source,
        /window\.addEventListener\(\s*"click"[\s\S]*module\.jitsi_meet\.overlay\.leave_blocked/,
    );
});

test("jitsi meetings reset participant state and hide chat hint when ready", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/app.js"),
        "utf8",
    );
    assert.match(source, /async function resetMeetingState\(\)/);
    assert.match(source, /resetParticipantSelection\(\);/);
    assert.match(source, /chatHint\.hidden = true;/);
});

test("meetings page defaults meeting and chat panels to half-width while keeping them resizable", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/app.js"),
        "utf8",
    );
    assert.match(
        source,
        /id:\s*"jitsi-stage"[\s\S]*gridSize:\s*\{[\s\S]*default:\s*\[6,\s*5\][\s\S]*min:\s*\[4,\s*4\]/,
    );
    assert.match(
        source,
        /id:\s*"jitsi-chat"[\s\S]*gridSize:\s*\{[\s\S]*default:\s*\[6,\s*5\][\s\S]*min:\s*\[4,\s*4\]/,
    );
    assert.doesNotMatch(
        source,
        /id:\s*"jitsi-stage"[\s\S]*gridSize:\s*\{[\s\S]*max:\s*"full"/,
    );
    assert.doesNotMatch(
        source,
        /id:\s*"jitsi-chat"[\s\S]*gridSize:\s*\{[\s\S]*max:\s*"full"/,
    );
});

test("reclaim session button uses success outline styling", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/app.js"),
        "utf8",
    );
    assert.match(source, /id="jitsi-reclaim-btn" class="btn-confirm"/);
});

test("meetings mini chat sends on Enter and hides explicit send button", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/app.js"),
        "utf8",
    );
    assert.doesNotMatch(source, /id="jitsi-chat-send"/);
    assert.match(source, /chatInput\.addEventListener\(\s*"keydown"/);
    assert.match(source, /event\.key !== "Enter"/);
    assert.match(source, /chatForm\.requestSubmit\(\)/);
});

test("meetings mini chat filters room-event records from rendering", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/app.js"),
        "utf8",
    );
    assert.match(
        source,
        /\.filter\(\s*\(message\)\s*=>[\s\S]*application\/vnd\.cognis\.room-event\+json/,
    );
});

test("page CSP allows loading Jitsi external_api.js", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/auth/guard.ts"),
        "utf8",
    );
    assert.match(
        source,
        /script-src 'self' https:\/\/meet\.firehawk-systems\.com;/,
    );
    assert.match(
        source,
        /script-src-elem 'self' https:\/\/meet\.firehawk-systems\.com;/,
    );
});

test("jitsi API dispatches meeting lifecycle and participant notifications", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/api/index.js"),
        "utf8",
    );
    assert.match(
        source,
        /registerNotificationCategory\("meetings", "Meetings"\)/,
    );
    assert.match(source, /subject: "Added to Meeting"/);
    assert.match(source, /subject: "Meeting Started"/);
    assert.match(source, /subject: "Meeting Ended"/);
    assert.match(source, /subject: "Participant Joined"/);
    assert.match(source, /subject: "Participant Left"/);
});
