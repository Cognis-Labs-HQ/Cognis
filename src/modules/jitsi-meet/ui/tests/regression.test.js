import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");

function readJitsiUiBundle() {
    const uiDir = resolve(ROOT, "src/modules/jitsi-meet/ui");
    return readdirSync(uiDir)
        .filter((entry) => entry.endsWith(".js"))
        .sort()
        .map((entry) => readFileSync(join(uiDir, entry), "utf8"))
        .join("\n");
}

function readJitsiApiBundle() {
    const apiDir = resolve(ROOT, "src/modules/jitsi-meet/api");
    return readdirSync(apiDir)
        .filter((entry) => entry.endsWith(".js"))
        .sort()
        .map((entry) => readFileSync(join(apiDir, entry), "utf8"))
        .join("\n");
}

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
    assert.match(
        source,
        /avatarKey:\s*typeof result\?\.avatarKey === "string"/,
    );
});

test("jitsi participant avatars reuse social avatar hydration and hide staged avatars while active", () => {
    const source = readJitsiUiBundle();
    const cssSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/jitsi-meet.css"),
        "utf8",
    );
    assert.match(source, /buildProfileAvatarMarkup/);
    assert.match(source, /handleProfileAvatarError/);
    assert.match(source, /hydrateProfileAvatars/);
    assert.match(
        source,
        /root\.addEventListener\("error", handleProfileAvatarError/,
    );
    assert.match(
        source,
        /const stagedEntries = utils\.isMeetingActive\(\)\s*\?\s*\[\]\s*:\s*state\.selectedParticipants;/,
    );
    assert.match(source, /void hydrateProfileAvatars\(availablePool\);/);
    assert.match(cssSource, /\.jitsi-participant-avatar-img/);
});

test("jitsi meeting group chats include the meeting date in their title", () => {
    const source = readJitsiApiBundle();
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
    const source = readJitsiUiBundle();
    assert.match(source, /preferenceKey:\s*"meetings-layout-v3"/);
});

test("jitsi meetings embed gates privileged settings by local moderator role and uses reduced toolbar", () => {
    const source = readJitsiUiBundle();
    const constantsSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/constants.js"),
        "utf8",
    );
    const embedSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/meeting-embed.js"),
        "utf8",
    );
    assert.match(
        constantsSource,
        /export const MEETING_SUBJECT = "Cognis Classroom";/,
    );
    const toolbarArrayMatch = constantsSource.match(
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
    assert.match(
        source,
        /interfaceConfigOverwrite: \{[\s\S]*DEFAULT_BACKGROUND: defaultBackground/,
    );
    assert.match(source, /disableDeepLinking: true,/);
    assert.match(source, /avatarUrl: state\.currentProfile\?\.avatarUrl/);
    assert.match(source, /"avatarUrl",[\s\S]*state\.currentProfile\.avatarUrl/);
    assert.match(
        embedSource,
        /hashParams\.set\("config\.disableDeepLinking", "true"\)/,
    );
    assert.match(
        embedSource,
        /hashParams\.set\("userInfo\.avatarUrl", profile\.avatarUrl\)/,
    );
    assert.match(
        embedSource,
        /hashParams\.set\("config\.subject", MEETING_SUBJECT\)/,
    );
    assert.match(
        embedSource,
        /hashParams\.set\("config\.preferredTheme", themeMode\)/,
    );
    assert.match(
        embedSource,
        /hashParams\.set\([\s\S]*"interfaceConfig\.DEFAULT_BACKGROUND",[\s\S]*resolveJitsiDefaultBackground\(themeMode\)/,
    );
    assert.match(source, /"password",[\s\S]*meetingPassword/);
    assert.match(
        source,
        /addEventListener\("passwordRequired", async \(\) => \{/,
    );
    assert.match(source, /const submitMeetingPassword = \(\) =>/);
    assert.match(source, /meeting:\$\{state\.meeting\.id\}:password/);
    assert.match(source, /setKeyringValue\(meetingKeyringId/);
    assert.match(source, /resolveKeyringValue\(/);
    assert.match(
        source,
        /participantRoleChanged[\s\S]*getParticipantRole\(event\) === "moderator"/,
    );
});

test("jitsi meetings lock participants and block navigation while meeting is active", () => {
    const source = readJitsiUiBundle();
    assert.match(source, /function isMeetingActive\(\)/);
    assert.match(source, /jitsi-participants-disabled/);
    assert.match(
        source,
        /window\.addEventListener\(\s*"beforeunload"[\s\S]*event\.returnValue = "";/,
    );
    assert.doesNotMatch(source, /function isRefreshShortcut\(event\)/);
    assert.doesNotMatch(source, /window\.addEventListener\(\s*"keydown"/);
    assert.match(
        source,
        /window\.addEventListener\(\s*"click"[\s\S]*module\.jitsi_meet\.overlay\.leave_blocked/,
    );
});

test("jitsi meetings reset participant state and disable mini chat until ready", () => {
    const source = readJitsiUiBundle();
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

test("meetings page defaults meeting and chat panels to a 70-30 split while keeping them resizable", () => {
    const source = readJitsiUiBundle();
    assert.match(
        source,
        /id:\s*"jitsi-stage"[\s\S]*gridSize:\s*\{[\s\S]*default:\s*\[7,\s*5\][\s\S]*min:\s*\[6,\s*4\]/,
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
    const source = readJitsiUiBundle();
    assert.match(
        source,
        /function recoverMeetingSessionAfterComposerRender\(\)/,
    );
    assert.match(source, /isMeetingEmbedMissing\(\)/);
    assert.match(source, /state\.jitsiApi = null;/);
    assert.match(source, /void callbacks[\s\S]*\.joinMeeting\(\)/);
    assert.match(
        source,
        /const bindSignal = bindController\.signal;[\s\S]*recoverMeetingSessionAfterComposerRender\(\);/,
    );
});

test("reclaim session button uses success outline styling", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/markup.js"),
        "utf8",
    );
    assert.match(source, /id="jitsi-reclaim-btn" class="btn-confirm"/);
});

test("meetings mini chat sends on Enter and hides explicit send button", () => {
    const source = readJitsiUiBundle();
    assert.doesNotMatch(source, /id="jitsi-chat-send"/);
    assert.match(source, /chatInput\.addEventListener\(\s*"keydown"/);
    assert.match(source, /event\.key !== "Enter"/);
    assert.match(source, /chatForm\.requestSubmit\(\)/);
});

test("meetings mini chat supports participant private-chat switching and return-to-meeting action", () => {
    const appSource = readJitsiUiBundle();
    const markupSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/markup.js"),
        "utf8",
    );
    const cssSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/jitsi-meet.css"),
        "utf8",
    );
    const stringsSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/languages/en/strings.xml"),
        "utf8",
    );

    assert.match(markupSource, /id="jitsi-chat-participant-strip"/);
    assert.match(markupSource, /id="jitsi-chat-return-btn"/);
    assert.match(markupSource, /<header class="jitsi-chat-header">/);
    assert.match(appSource, /chatMode:\s*"meeting"/);
    assert.match(appSource, /lastMeetingChatRoomId/);
    assert.match(appSource, /async function activatePrivateChatForParticipant/);
    assert.match(appSource, /async function activateMeetingChat/);
    assert.match(appSource, /state\.chatMode !== "private"/);
    assert.match(appSource, /if \(!state\.meeting\?\.id\) return \[\];/);
    assert.match(appSource, /strip\.hidden = entries\.length === 0;/);
    assert.match(appSource, /state\.lastMeetingParticipants = \[\];/);
    assert.match(appSource, /\/api\/v1\/social\/messages\/rooms/);
    assert.match(cssSource, /\.jitsi-chat-participant-strip/);
    assert.match(cssSource, /overflow-y: hidden;/);
    assert.match(
        cssSource,
        /\.jitsi-chat-participant-strip::-webkit-scrollbar/,
    );
    assert.match(cssSource, /\.jitsi-chat-header/);
    assert.match(cssSource, /\.jitsi-chat-return-btn/);
    assert.match(cssSource, /\.jitsi-chat-participant-item\.active/);
    assert.match(stringsSource, /module\.jitsi_meet\.chat\.return_to_meeting/);
    assert.match(
        stringsSource,
        /module\.jitsi_meet\.chat\.private_open_failed/,
    );
});

test("meetings session state polling handles closed meetings and distinct leave messaging", () => {
    const source = readJitsiUiBundle();
    assert.match(source, /latestState\.endedAt/);
    assert.match(source, /module\.jitsi_meet\.overlay\.meeting_closed/);
    assert.match(source, /module\.jitsi_meet\.overlay\.meeting_left/);
    assert.match(source, /honorMeetingClosed: false/);
    assert.match(
        source,
        /addEventListener\("readyToClose", handleMeetingLeft\)/,
    );
    const constantsSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/constants.js"),
        "utf8",
    );
    assert.match(
        constantsSource,
        /MEETING_TERMINATED_TEXT = "meeting terminated"/,
    );
    assert.match(source, /addEventListener\("notificationTriggered"/);
    assert.match(source, /reportTerminated: true/);
});

test("jitsi API resets ended meetings and reports meetingClosed from presence updates", () => {
    const source = readJitsiApiBundle();
    assert.match(
        source,
        /!resolved\.state\.endedAt && conflictingSessions\.length > 0/,
    );
    assert.match(source, /endedBy:\s*resolved\.requesterUsername/);
    assert.doesNotMatch(source, /participantCount === 2/);
    assert.match(source, /meetingClosed:/);
    assert.match(
        source,
        /const meetingTerminated = body\.terminated === true;/,
    );
    assert.match(source, /meetingTerminated \|\|/);
});

test("meetings UI prompts a participant who becomes alone before leaving", () => {
    const source = readJitsiUiBundle();
    const markupSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/markup.js"),
        "utf8",
    );
    const constantsSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/constants.js"),
        "utf8",
    );
    assert.match(markupSource, /id="jitsi-leave-alone-btn"/);
    assert.match(markupSource, /id="jitsi-remain-alone-btn"/);
    assert.match(constantsSource, /ALONE_PROMPT_GRACE_PERIOD_MS = 180_000/);
    assert.match(source, /function deferAloneParticipantPrompt\(/);
    assert.match(
        source,
        /state\.alonePromptBlockedUntil = Date\.now\(\) \+ delayMs;/,
    );
    assert.match(
        source,
        /function shouldPromptLocalUserAlone\(activeParticipants\)/,
    );
    assert.match(source, /Date\.now\(\) < state\.alonePromptBlockedUntil/);
    assert.match(
        source,
        /function updateAloneParticipantPrompt\(activeParticipants\)/,
    );
    assert.match(source, /module\.jitsi_meet\.overlay\.alone_prompt/);
    assert.match(source, /alonePromptDismissedMeetingId/);
    assert.match(
        source,
        /const joinPayload = await joinResponse\.json\(\);\n\s*state\.meeting = joinPayload\?\.data \?\? state\.meeting;\n\s*utils\.deferAloneParticipantPrompt\(\);/,
    );
    assert.match(
        source,
        /state\.meeting = joinPayload\?\.data \?\? state\.meeting;/,
    );
    assert.match(source, /authButton\.addEventListener\(/);
    assert.match(
        source,
        /if \(!state\.meeting\?\.id\) return;\n\s*deferAloneParticipantPrompt\(\);/,
    );
    assert.match(
        source,
        /apiInstance\.addEventListener\("passwordRequired", async \(\) => \{/,
    );
    assert.match(
        source,
        /utils\.deferAloneParticipantPrompt\(\);[\s\S]*resolveKeyringValue[\s\S]*submitMeetingPassword\(\);/,
    );

    assert.match(source, /async function loadMeetingState\(\)/);
    assert.match(source, /module\.jitsi_meet\.overlay\.auth_waiting/);
    assert.match(
        source,
        /callbacks\.updateAloneParticipantPrompt\(\s*payload\?\.data\?\.activeParticipants,/,
    );
    assert.match(
        source,
        /if \(latestState\.authRequired && !latestState\.authCompletedAt\) \{[\s\S]*return;[\s\S]*\}/,
    );
    assert.match(
        source,
        /jitsi-leave-alone-btn[\s\S]*module\.jitsi_meet\.overlay\.meeting_left/,
    );
});

test("meeting presence waits for a confirmed join before allowing tracking", () => {
    const embedSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/jitsi-embed.js"),
        "utf8",
    );
    const preflightSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/jitsi-preflight.js"),
        "utf8",
    );
    assert.match(
        embedSource,
        /addEventListener\("videoConferenceJoined", \(event\) => \{[\s\S]*if \(state\.jitsiApi !== apiInstance\) return;[\s\S]*void callbacks\.keepPresenceAlive\(true\);/,
    );
    assert.doesNotMatch(
        embedSource,
        /frame\.hidden = false;[\s\S]*await callbacks\.keepPresenceAlive\(true\);/,
    );
    assert.match(
        embedSource,
        /if \(state\.meeting\.waitingForAuthentication\) \{[\s\S]*return \{ trackingAllowed: false \};/,
    );
    assert.match(
        embedSource,
        /if \(\s*state\.meeting\.state\?\.authRequired[\s\S]*return \{ trackingAllowed: false \};/,
    );
    assert.match(
        embedSource,
        /await openMeetingEmbed\(\);\n\s*return \{ trackingAllowed: true \};/,
    );
    assert.match(preflightSource, /function shouldTrackMeetingPresence\(\)/);
    assert.match(
        preflightSource,
        /function ensureMeetingTracking\(\) \{\n\s*if \(!shouldTrackMeetingPresence\(\)\) return;/,
    );
});

test("meetings overlay strings include alone participant prompt actions", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/languages/en/strings.xml"),
        "utf8",
    );
    assert.match(source, /module\.jitsi_meet\.overlay\.alone_prompt/);
    assert.match(source, /module\.jitsi_meet\.overlay\.leave_meeting/);
    assert.match(source, /module\.jitsi_meet\.overlay\.remain_in_meeting/);
});

test("meetings mini chat filters room-event records from rendering", () => {
    const source = readJitsiUiBundle();
    assert.match(
        source,
        /\.filter\(\s*\(message\)\s*=>[\s\S]*application\/vnd\.cognis\.room-event\+json/,
    );
});

test("meetings mini chat supports the Messages reaction floating menu", () => {
    const appSource = readJitsiUiBundle();
    const reactionsSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/reactions.js"),
        "utf8",
    );
    const sharedCssSource = readFileSync(
        resolve(
            ROOT,
            "src/adapters/social/messages/ui/messages-chat-shared.css",
        ),
        "utf8",
    );
    assert.match(
        appSource,
        /async function loadMessageUiResources\(\)[\s\S]*\/api\/v1\/modules\/jitsi-meet\/ui-resources/,
    );
    assert.match(appSource, /async function loadMessageReactionsController\(/);
    assert.match(appSource, /messageReactions\.renderReactionRow\(message\)/);
    assert.match(appSource, /messageReactions\.openEmojiPickerPopup/);
    assert.match(reactionsSource, /data-reaction-more="1"/);
    assert.match(
        reactionsSource,
        /\/api\/v1\/social\/messages\/rooms\/\$\{encodeURIComponent\(roomId\)\}\/messages\/\$\{encodeURIComponent\(messageId\)\}\/reactions/,
    );
    assert.match(
        sharedCssSource,
        /\.jitsi-chat-message \.messages-reactions-row/,
    );
    assert.match(sharedCssSource, /\.messages-reaction-hover-popup/);
    assert.match(sharedCssSource, /\.messages-emoji-picker/);
});

test("meetings speech bubbles use the same contrast-oriented color tokens as Messages", () => {
    const variantsCssSource = readFileSync(
        resolve(
            ROOT,
            "src/adapters/social/messages/ui/messages-style-variants.css",
        ),
        "utf8",
    );
    assert.match(
        variantsCssSource,
        /html\[data-message-style="speech_bubbles"\][\s\S]*\.jitsi-chat-message:not\(\.jitsi-chat-message-own\)[\s\S]*background:\s*var\(--color-surface-elevated\);[\s\S]*border-color:\s*var\(--color-border\);/,
    );
    assert.match(
        variantsCssSource,
        /html\[data-message-style="speech_bubbles"\][\s\S]*\.jitsi-chat-message-own[\s\S]*background:\s*var\(--color-accent\);[\s\S]*color:\s*var\(--color-accent-contrast\);/,
    );
});

test("jitsi API dispatches meeting lifecycle and participant notifications", () => {
    const source = readJitsiApiBundle();
    const uiResourcesSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/api/ui-resources.js"),
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
    assert.match(source, /function buildMeetingEmailLink\(meetingId\)/);
    assert.match(source, /function appendMeetingLinkToBody\(body, meetingId\)/);
    assert.match(source, /Meeting link: /);
    assert.match(source, /body: bodyWithMeetingLink/);
    assert.match(source, /organizerUsername: resolved\.meeting\.createdBy/);
    assert.match(source, /organizerUsername: meeting\.createdBy/);
    assert.match(source, /excludeUsernames: \[resolved\.requesterUsername\]/);
    assert.match(source, /excludedRecipients\.has\(normalizedCandidate\)/);
    assert.match(source, /senderName:/);
    assert.match(source, /actionUrl: buildMeetingActionUrl/);
    assert.match(source, /resolveMessagesUiResources/);
    assert.match(
        uiResourcesSource,
        /\/api\/v1\/modules\/jitsi-meet\/ui-resources/,
    );
});

test("administration meetings section labels active and upcoming tables", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/admin-meetings-section.js"),
        "utf8",
    );
    const stringsSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/languages/en/strings.xml"),
        "utf8",
    );

    const adminRoutesSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/api/admin-meetings-routes.js"),
        "utf8",
    );
    const lifecycleRoutesSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/api/meeting-lifecycle-routes.js"),
        "utf8",
    );
    const calendarApiSource = readFileSync(
        resolve(ROOT, "src/gateways/calendar/ui/calendar-api.js"),
        "utf8",
    );
    assert.match(
        source,
        /module\.jitsi_meet\.admin\.meetings\.active_table_heading/,
    );
    assert.match(
        source,
        /module\.jitsi_meet\.admin\.meetings\.upcoming_table_heading/,
    );
    assert.match(source, /createdByDisplayName/);
    assert.match(source, /row\.scheduledAt \?\? row\.createdAt/);
    assert.match(source, /<col style="width: 1%" \/>/);
    assert.match(source, /<col style="width: 24\.75%" \/>/);
    assert.match(source, /white-space: nowrap/);
    assert.match(source, /admin\.meetings\.meeting_url/);
    assert.match(source, /admin\.meetings\.schedule_date/);
    assert.match(stringsSource, /Active Meetings/);
    assert.match(stringsSource, /Upcoming Meetings/);
    assert.match(stringsSource, /Meeting URL/);
    assert.match(stringsSource, /Schedule Date/);
    assert.match(adminRoutesSource, /createdByDisplayName/);
    assert.match(lifecycleRoutesSource, /scheduledAt: body\.scheduledAt/);
    assert.match(calendarApiSource, /scheduledAt/);
});

test("meetings UI renders active meetings panel and deep-link join support", () => {
    const source = readJitsiUiBundle();
    const markupSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/markup.js"),
        "utf8",
    );
    const embedSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/meeting-embed.js"),
        "utf8",
    );
    assert.match(
        markupSource,
        /module\.jitsi_meet\.participants\.active_meetings/,
    );
    assert.match(source, /\/api\/v1\/modules\/jitsi-meet\/meetings\/active/);
    assert.match(source, /requestedMeetingId/);
    assert.match(source, /async function joinMeetingById/);
    assert.match(
        source,
        /await loadActiveMeetings\(\{ resolveRequested: true \}\)/,
    );
    assert.match(embedSource, /function readThemeCookie\(\)/);
    assert.match(embedSource, /explicitMode/);
    assert.match(embedSource, /const JITSI_THEME_BACKGROUNDS = \{/);
    assert.match(embedSource, /export function resolveJitsiDefaultBackground/);
    assert.match(embedSource, /document\.querySelector\("\.app-shell"\)/);
    assert.match(source, /async function switchAwayFromActiveMeeting\(\)/);
    assert.match(source, /await switchAwayFromActiveMeeting\(\)/);
    assert.match(markupSource, /role="grid"/);
});

test("meetings UI keeps Jitsi theme and active-meeting table responsive", () => {
    const appSource = readJitsiUiBundle();
    const cssSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/jitsi-meet.css"),
        "utf8",
    );
    assert.doesNotMatch(appSource, /jitsi-theme-sync/);
    assert.doesNotMatch(appSource, /applyJitsiWindowTheme/);
    assert.match(appSource, /const syncJitsiTheme = \(event\) =>/);
    assert.doesNotMatch(appSource, /function syncMobileChatPaneWidth\(\)/);
    assert.doesNotMatch(
        appSource,
        /const MOBILE_LAYOUT_MEDIA_QUERY = "\(max-width: 720px\)"/,
    );
    assert.match(
        appSource,
        /executeJitsiCommandIfSupported\(state\.jitsiApi, "overwriteConfig", \{[\s\S]*preferredTheme: nextThemeMode,[\s\S]*\}\);[\s\S]*interfaceConfigOverwrite at API creation/,
    );
    assert.match(appSource, /new MutationObserver\(syncJitsiTheme\)/);
    assert.match(appSource, /if \(themeChanged\) void openMeetingEmbed\(\);/);
    assert.match(appSource, /"cognis:themechange", syncJitsiTheme/);
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
    const indexSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/api/index.js"),
        "utf8",
    );
    const meetingsRoutesSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/api/meetings-routes.js"),
        "utf8",
    );
    assert.match(indexSource, /registerMeetingRoutes\(/);
    assert.match(
        meetingsRoutesSource,
        /"\/api\/v1\/modules\/jitsi-meet\/meetings\/active"/,
    );
    assert.match(
        meetingsRoutesSource,
        /const activeMeetings = await store\.listActiveMeetings\(\)/,
    );
    assert.match(
        meetingsRoutesSource,
        /if \(state\.authRequired && !state\.authCompletedAt\) continue;/,
    );
});

test("jitsi opts into composer DOM parking for its stateful iframe", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/app.js"),
        "utf8",
    );
    assert.match(source, /enableDomParking: true/);
});
