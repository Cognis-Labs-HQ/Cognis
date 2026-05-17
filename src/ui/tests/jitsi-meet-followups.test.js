import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

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

test("jitsi meeting group chats include the meeting date in their title", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/api/index.js"),
        "utf8",
    );
    assert.match(source, /function buildMeetingChatTitle[\s\S]*slice\(0, 10\)/);
    assert.match(source, /title:\s*meetingChatTitle/);
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

test("jitsi meetings embed gates privileged settings by local moderator role and uses reduced toolbar", () => {
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
    assert.match(source, /currentUserIsJitsiModerator\(apiInstance\)/);
    assert.match(source, /"subject",[\s\S]*MEETING_SUBJECT/);
    assert.match(source, /preferredTheme: themeMode,/);
    assert.match(source, /disableDeepLinking: true,/);
    assert.match(source, /avatarUrl: state\.currentProfile\?\.avatarUrl/);
    assert.match(source, /"avatarUrl",[\s\S]*state\.currentProfile\.avatarUrl/);
    assert.match(
        source,
        /hashParams\.set\("config\.disableDeepLinking", "true"\)/,
    );
    assert.match(
        source,
        /hashParams\.set\("userInfo\.avatarUrl", profile\.avatarUrl\)/,
    );
    assert.match(
        source,
        /hashParams\.set\("config\.subject", MEETING_SUBJECT\)/,
    );
    assert.match(
        source,
        /hashParams\.set\("config\.preferredTheme", themeMode\)/,
    );
    assert.match(source, /"password",[\s\S]*meetingPassword/);
    assert.match(source, /addEventListener\("passwordRequired", \(\) => \{/);
    assert.match(source, /const submitMeetingPassword = \(\) =>/);
    assert.match(
        source,
        /participantRoleChanged[\s\S]*getParticipantRole\(event\) === "moderator"/,
    );
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

test("jitsi meetings reset participant state and disable mini chat until ready", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/app.js"),
        "utf8",
    );
    const cssSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/jitsi-meet.css"),
        "utf8",
    );
    assert.match(source, /async function resetMeetingState\(\s*\{/);
    assert.match(source, /resetParticipantSelection\(\);/);
    assert.doesNotMatch(source, /jitsi-chat-hint/);
    assert.match(source, /function setNativeChatReady\(ready\)/);
    assert.match(source, /jitsi-chat-disabled/);
    assert.match(source, /chatInput\.disabled = !ready;/);
    assert.match(source, /aria-busy/);
    assert.match(cssSource, /\.jitsi-chat-pane\.jitsi-chat-disabled/);
    assert.match(cssSource, /pointer-events: none;/);
});

test("meetings page defaults meeting and chat panels to 75-25 split while keeping them resizable", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/app.js"),
        "utf8",
    );
    assert.match(
        source,
        /id:\s*"jitsi-stage"[\s\S]*gridSize:\s*\{[\s\S]*default:\s*\[9,\s*5\][\s\S]*min:\s*\[6,\s*4\]/,
    );
    assert.match(
        source,
        /id:\s*"jitsi-chat"[\s\S]*gridSize:\s*\{[\s\S]*default:\s*\[3,\s*5\][\s\S]*min:\s*\[3,\s*4\]/,
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

test("meetings UI recovers a live session after composer edit rerenders the iframe", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/app.js"),
        "utf8",
    );
    assert.match(
        source,
        /function recoverMeetingSessionAfterComposerRender\(\)/,
    );
    assert.match(source, /isMeetingEmbedMissing\(\)/);
    assert.match(source, /state\.jitsiApi = null;[\s\S]*void joinMeeting\(\)/);
    assert.match(
        source,
        /const bindSignal = bindController\.signal;[\s\S]*recoverMeetingSessionAfterComposerRender\(\);/,
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

test("meetings session state polling handles closed meetings and distinct leave messaging", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/app.js"),
        "utf8",
    );
    assert.match(source, /latestState\.endedAt/);
    assert.match(source, /module\.jitsi_meet\.overlay\.meeting_closed/);
    assert.match(source, /module\.jitsi_meet\.overlay\.meeting_left/);
    assert.match(
        source,
        /addEventListener\("readyToClose", handleMeetingClosed\)/,
    );
    assert.match(source, /MEETING_TERMINATED_TEXT = "meeting terminated"/);
    assert.match(source, /addEventListener\("notificationTriggered"/);
    assert.match(source, /reportTerminated: true/);
});

test("jitsi API resets ended meetings and reports meetingClosed from presence updates", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/api/index.js"),
        "utf8",
    );
    assert.match(
        source,
        /!resolved\.state\.endedAt && conflictingSessions\.length > 0/,
    );
    assert.match(source, /endedBy:\s*resolved\.requesterUsername/);
    assert.match(source, /participantCount === 2/);
    assert.match(source, /meetingClosed:/);
    assert.match(
        source,
        /const meetingTerminated = body\.terminated === true;/,
    );
    assert.match(source, /meetingTerminated \|\|/);
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
    assert.match(source, /function buildMeetingActionUrl\(meetingId\)/);
    assert.match(source, /senderName:/);
    assert.match(source, /actionUrl: buildMeetingActionUrl/);
});

test("meetings UI renders active meetings panel and deep-link join support", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/app.js"),
        "utf8",
    );
    assert.match(source, /module\.jitsi_meet\.participants\.active_meetings/);
    assert.match(source, /\/api\/v1\/modules\/jitsi-meet\/meetings\/active/);
    assert.match(source, /requestedMeetingId/);
    assert.match(source, /async function joinMeetingById/);
    assert.match(
        source,
        /await loadActiveMeetings\(\{ resolveRequested: true \}\)/,
    );
    assert.match(source, /function readThemeCookie\(\)/);
    assert.match(source, /document\.querySelector\("\.app-shell"\)/);
    assert.match(source, /async function switchAwayFromActiveMeeting\(\)/);
    assert.match(source, /await switchAwayFromActiveMeeting\(\)/);
    assert.match(source, /role="grid"/);
});

test("meetings UI keeps Jitsi theme and active-meeting table responsive", () => {
    const appSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/app.js"),
        "utf8",
    );
    const cssSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/jitsi-meet.css"),
        "utf8",
    );
    assert.match(appSource, /const syncJitsiTheme = \(\) =>/);
    assert.match(
        appSource,
        /executeJitsiCommandIfSupported\(state\.jitsiApi, "overwriteConfig", \{[\s\S]*preferredTheme: nextThemeMode/,
    );
    assert.match(appSource, /new MutationObserver\(syncJitsiTheme\)/);
    assert.match(
        cssSource,
        /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/,
    );
    assert.match(
        cssSource,
        /max-width: 720px[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/,
    );
    assert.match(
        cssSource,
        /max-width: 520px[\s\S]*grid-template-columns: 1fr/,
    );
});

test("jitsi API exposes user active meetings endpoint", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/api/index.js"),
        "utf8",
    );
    assert.match(source, /"\/api\/v1\/modules\/jitsi-meet\/meetings\/active"/);
    assert.match(
        source,
        /const activeMeetings = await store\.listActiveMeetings\(\)/,
    );
    assert.match(
        source,
        /if \(state\.authRequired && !state\.authCompletedAt\) continue;/,
    );
});
