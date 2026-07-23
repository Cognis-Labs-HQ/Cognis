import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("search popup checked indicator stays centered in selectable rows", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/styles/reuse/search-bar.css"),
        "utf8",
    );
    assert.match(source, /transform: translate\(-50%, -58%\) rotate\(45deg\);/);
});

test("global search modules result points to Administration components", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    assert.match(source, /id: "page-modules"/);
    assert.match(source, /url: "\/administration#components"/);
    assert.match(
        source,
        /ui\.reuse\.administration[\s\S]*ui\.app\.admin\.components[\s\S]*ui\.reuse\.modules/,
    );
    assert.doesNotMatch(source, /url: "\/modules"/);
});

test("global search exposes registered categories and match controls", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/search-bar.js"),
        "utf8",
    );
    assert.match(source, /export function registerSearchCategory/);
    assert.match(source, /export function registerSearchIndex/);
    assert.match(source, /registerSearchCategory\("visible-page"/);
    assert.match(source, /stageId: "visible-indexes"/);
    assert.match(source, /registerSearchCategory\("visible-content"/);
    assert.match(source, /uiCtx\.runFlow\("search"/);
    assert.match(source, /data-search-exclude/);
    assert.match(source, /collectBrowserPreferenceSearchGroups/);
    assert.match(source, /data-message-id/);
    assert.match(source, /data-chat-id/);
    assert.match(source, /data-search-description/);
    assert.doesNotMatch(source, /article, \[role='article'\]/);
    assert.match(source, /"Whole word"/);
    assert.match(source, /"Regex"/);
    assert.match(source, /"Case-sensitive"/);
    assert.match(source, /wholeWord=1/);
    assert.match(source, /regex=1/);
    assert.match(source, /caseSensitive=1/);
    assert.match(source, /matchSnippet/);
    assert.match(source, /highlightedLabel/);
    assert.match(source, /selectSearchResult/);
});

test("settings search exposes archive action by name and description", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/settings/index.js"),
        "utf8",
    );
    assert.match(source, /data-search-category="Settings"/);
    assert.match(source, /ui\.app\.settings\.danger_archive/);
    assert.match(source, /data-search-description/);
    assert.match(source, /ui\.app\.settings\.danger_archive_warning/);
    assert.match(source, /registerSearchIndex/);
    assert.match(source, /collectSettingsSearchGroups/);
    assert.match(source, /stageId: "settings-index"/);
});

test("whiteboard search indexes board filenames and stored canvas contents", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/nextcloud-whiteboard/ui/app/index.js"),
        "utf8",
    );
    assert.match(source, /registerSearchIndex\("nextcloud-whiteboard"/);
    assert.match(source, /collectWhiteboardSearchGroups/);
    assert.match(source, /externalPath/);
    assert.match(source, /JSON\.stringify\(savedElements/);
});

test("visible search indexes messages without quick reactions and chat names", () => {
    const messageSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/message-render.js"),
        "utf8",
    );
    const roomSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/room-render.js"),
        "utf8",
    );
    assert.match(messageSource, /data-search-text/);
    assert.match(
        messageSource,
        /data-search-exclude="true">\$\{reactionRows\.pickerRow\}/,
    );
    assert.match(
        messageSource,
        /data-search-exclude="true">\$\{reactionRows\.activeRow\}/,
    );
    assert.match(roomSource, /data-chat-id/);
    assert.match(
        roomSource,
        /data-search-label="\$\{escapeHtml\(titleSource\)\}"/,
    );
});

test("visible search indexes meetings calendar notifications and posts", () => {
    const meetingSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/jitsi-meetings.js"),
        "utf8",
    );
    const calendarSource = readFileSync(
        resolve(ROOT, "src/gateways/calendar/ui/calendar-ui-helpers.js"),
        "utf8",
    );
    const notificationSource = readFileSync(
        resolve(ROOT, "src/adapters/notify/internal/ui/navbar-plugin.js"),
        "utf8",
    );
    const profileSource = readFileSync(
        resolve(ROOT, "src/adapters/social/profile/ui/profile-render.js"),
        "utf8",
    );
    assert.match(meetingSource, /dataset\.searchCategory = "Meetings"/);
    assert.match(
        readFileSync(resolve(ROOT, "src/modules/jitsi-meet/ui/app.js"), "utf8"),
        /registerSearchIndex\("jitsi-meetings"/,
    );
    assert.match(calendarSource, /data-search-category="Calendar Events"/);
    assert.match(
        readFileSync(
            resolve(ROOT, "src/gateways/calendar/ui/app/index.js"),
            "utf8",
        ),
        /registerSearchIndex\("calendar-events"/,
    );
    assert.match(
        notificationSource,
        /dataset\.searchCategory = "Notifications"/,
    );
    assert.match(profileSource, /data-search-category="Posts"/);
});
