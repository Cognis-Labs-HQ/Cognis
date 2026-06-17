import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();

test("classroom render includes workspace tabs and roster panel", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/ui/classroom-render/workspace.js",
        ),
        "utf8",
    );

    assert.match(source, /classes-workspace-tab-btn/);
    assert.match(source, /classes-roster-panel/);
    assert.match(source, /members_present/);
    assert.match(source, /members_absent/);
    assert.match(source, /classes-sidebar-students-section/);
    assert.match(source, /classes-sidebar-materials-section/);
    assert.match(source, /classes-sidebar-panel-wrap/);
    assert.match(source, /classes-notepad-host/);
    assert.match(source, /classes-workspace-tile--chat/);
    assert.match(source, /classes-meeting-workspace-host/);
    assert.match(source, /classes-agenda-document-editor/);
    assert.match(source, /classes-material-add-btn/);
    assert.match(source, /classes-material-unlink-btn/);
});

test("classroom whiteboard actions support inline and pop-out modes", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/ui/classroom-whiteboard-actions.js",
        ),
        "utf8",
    );

    assert.match(source, /classes-workspace-tab-btn/);
    assert.match(source, /suppressConnectionRecoveryToast:\s*true/);
    assert.match(source, /classes-inline-whiteboard-popout-btn/);
    assert.match(source, /classes-popout-whiteboard-btn/);
    assert.match(source, /setWorkspaceMode\("whiteboard"\)/);
    assert.match(source, /persistActiveWhiteboardId/);
});

test("classroom render gates student meeting and whiteboard controls", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/ui/classroom-render/index.js",
        ),
        "utf8",
    );

    assert.match(source, /canAccessWhiteboard/);
    assert.match(source, /activeWhiteboardId/);
    assert.match(source, /classes-blackboard-body/);
});

test("classroom sub-navigation always renders the search button", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/ui/classroom-sub-navigation.js",
        ),
        "utf8",
    );

    assert.match(source, /classes-subnav-find-btn/);
    assert.doesNotMatch(source, /isTeacherView \?/);
});

test("classroom view sync detaches search and only forces live teacher meetings", () => {
    const indexSource = readFileSync(
        resolve(ROOT, "src/adapters/study/classes/ui/classroom/index.js"),
        "utf8",
    );
    const dataLoaderSource = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/ui/classroom/data-loaders.js",
        ),
        "utf8",
    );
    const helpersSource = readFileSync(
        resolve(ROOT, "src/adapters/study/classes/ui/classroom/helpers.js"),
        "utf8",
    );
    assert.match(indexSource, /isClassSearchDetached/);
    assert.match(dataLoaderSource, /if \(!getIsClassSearchDetached\(\)\)/);
    assert.match(helpersSource, /teacherActiveInMeeting/);
    assert.match(helpersSource, /activeParticipants\.some/);
    assert.match(
        indexSource,
        /const getWorkspaceMode = \(\) => workspaceMode;/,
    );
    assert.doesNotMatch(
        indexSource,
        /setWorkspaceMode\("agenda"\);\s*await refreshContent\(\);/,
    );
});

test("classroom tile layout uses DB-backed preference helpers", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/study/classes/ui/classroom/index.js"),
        "utf8",
    );

    assert.match(source, /loadTileLayoutPreference/);
    assert.match(source, /saveTileLayoutPreference/);
    assert.doesNotMatch(source, /cognis_tile_layout_/);
});

test("classroom meeting tile refresh updates slideshow controls in place", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/ui/classroom-dynamic-refresh.js",
        ),
        "utf8",
    );

    assert.match(source, /classes-workspace-panel--tiled/);
    assert.match(source, /classes-tile-nav-prev/);
    assert.match(source, /classes-tile-nav-next/);
    assert.match(source, /classes-tile-layout-toggle-btn/);
});

test("notepad adapter routes support agenda document and snapshots", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/routes/classroom-notes-route.ts",
        ),
        "utf8",
    );
    assert.match(source, /agendaDocument/);
    assert.match(source, /agendaSnapshots/);
    assert.match(source, /agenda\\\/snapshots/);
    assert.match(source, /agenda\\\/open/);
});

test("classroom materials library routes support list rename and delete", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/routes/classroom-files-route.ts",
        ),
        "utf8",
    );
    assert.match(source, /materials\\\/library/);
    assert.match(source, /materials\\\/library\\\/rename/);
    assert.match(source, /materials\\\/library\\\/delete/);
    assert.match(source, /teacher-materials/);
    assert.match(source, /getClassesForTeacher/);
});

test("notepad adapter routes support notepad file rename", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/routes/classroom-notes-route.ts",
        ),
        "utf8",
    );
    assert.match(source, /classroom-notes.*\/files.*\/rename/s);
    assert.match(source, /classroom-notes/);
});

test("teacher materials upload popup binds upload logic on open", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/ui/classroom-resource-actions.js",
        ),
        "utf8",
    );

    assert.match(source, /onOpen:\s*\(overlay\)/);
    assert.doesNotMatch(source, /onMount:\s*\(overlay\)/);
    assert.match(source, /materialsPopupOpen/);
    assert.match(source, /teacher-materials/);
    assert.match(source, /classes-library-file-card/);
    assert.doesNotMatch(source, /classes-library-select/);
    assert.doesNotMatch(source, /classes-library-rename-btn/);
});

test("stacked tile ordering uses the shared move-to-end helper", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/ui/classroom/click-handler.js",
        ),
        "utf8",
    );
    const helperSource = readFileSync(
        resolve(ROOT, "src/adapters/study/classes/ui/classroom/helpers.js"),
        "utf8",
    );

    assert.match(source, /moveTileToStackEnd/);
    assert.match(helperSource, /export function moveTileToStackEnd/);
    assert.match(helperSource, /tileIndex < 0 \|\| tileIndex === lastIndex/);
    assert.match(
        helperSource,
        /normalizedOrder\[tileIndex\] = normalizedOrder\[lastIndex\]/,
    );
});

test("student boardFocus sync applies regardless of meeting state", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/ui/classroom/student-sync.js",
        ),
        "utf8",
    );

    assert.match(
        source,
        /setWorkspaceMode\(boardFocus, \{ remember: true \}\)/,
    );
    assert.doesNotMatch(
        source,
        /workspaceMode !== "meeting" && !classroomWindows\?\.isMeetingOpen\(\)/,
    );
    assert.match(source, /MEETING_SYNC_GRACE_MS = 12000/);
    assert.match(
        source,
        /now - meetingModeWithoutMeetingSince < MEETING_SYNC_GRACE_MS/,
    );
    assert.match(source, /let allowMeetingFallback = true/);
    assert.match(source, /allowMeetingFallback = false/);
    assert.match(source, /if \(\s*allowMeetingFallback &&/);
    assert.match(source, /boardFocus === "classroom" \? "agenda" : boardFocus/);
});

test("classroom student polling awaits teacher view-state and runs faster", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/study/classes/ui/classroom/index.js"),
        "utf8",
    );

    assert.match(source, /intervalMs: isTeacherView\(\) \? 3000 : 1000/);
    assert.match(source, /await pollTeacherViewState\(\)/);
});

test("teacher meeting close broadcasts boardFocus to students", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/study/classes/ui/classroom/index.js"),
        "utf8",
    );

    assert.match(
        source,
        /isTeacherView\(\)\s*\)\s*\{\s*void updateBoardFocus\(returnWorkspaceMode\)/,
    );
    assert.match(source, /returnWorkspaceMode/);
});

test("classroom chat delegates to the social gateway embedded chat factory", () => {
    const chatSource = readFileSync(
        resolve(ROOT, "src/adapters/study/classes/ui/classroom-chat.js"),
        "utf8",
    );
    const embedSource = readFileSync(
        resolve(
            ROOT,
            "src/adapters/social/messages/ui/classroom-chat-embed.js",
        ),
        "utf8",
    );
    const chatCssSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/classroom-chat.css"),
        "utf8",
    );

    assert.match(chatSource, /meta\[name="classroom-chat-script"\]/);
    assert.match(embedSource, /classes-chat-thread/);
    assert.match(embedSource, /classes-chat-message/);
    assert.match(chatCssSource, /messages-style-variants\.css/);
    assert.match(chatCssSource, /messages-chat-shared\.css/);
});

test("classroom avatar helpers load dynamically instead of hard-importing social UI assets", () => {
    const indexSource = readFileSync(
        resolve(ROOT, "src/adapters/study/classes/ui/classroom/index.js"),
        "utf8",
    );
    const helperSource = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/ui/classroom/profile-avatar.js",
        ),
        "utf8",
    );
    const renderSource = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/ui/classroom-render/index.js",
        ),
        "utf8",
    );
    const refreshSource = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/ui/classroom-dynamic-refresh.js",
        ),
        "utf8",
    );
    const popupsSource = readFileSync(
        resolve(ROOT, "src/adapters/study/classes/ui/classroom-popups.js"),
        "utf8",
    );

    assert.match(indexSource, /classroom\/profile-avatar\.js/);
    assert.match(
        helperSource,
        /meta\[name="classroom-profile-avatar-script"\]/,
    );
    assert.match(helperSource, /Failed to load profile avatar helpers/);
    assert.match(
        renderSource,
        /from "\/static\/adapters\/study\/classes\/classroom\/profile-avatar\.js"/,
    );
    assert.match(
        refreshSource,
        /from "\/static\/adapters\/study\/classes\/classroom\/profile-avatar\.js"/,
    );
    assert.match(popupsSource, /meta\[name="classroom-profile-preview-script"\]/);
    assert.doesNotMatch(
        indexSource,
        /from "\/static\/gateways\/social\/reuse\/profile-avatar\.js"/,
    );
    assert.doesNotMatch(
        renderSource,
        /from "\/static\/gateways\/social\/reuse\/profile-avatar\.js"/,
    );
    assert.doesNotMatch(
        refreshSource,
        /from "\/static\/gateways\/social\/reuse\/profile-avatar\.js"/,
    );
    assert.doesNotMatch(
        popupsSource,
        /from "\/static\/reuse\/profile-preview\.js"/,
    );
    assert.doesNotMatch(
        popupsSource,
        /from "\/static\/gateways\/social\/reuse\/profile-avatar\.js"/,
    );
});

test("classroom materials render in the workspace viewer instead of the sidebar", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/ui/classroom-render/workspace.js",
        ),
        "utf8",
    );

    assert.match(source, /classes-workspace-panel--materials-viewer/);
    assert.match(source, /activeMaterialPreview/);
    assert.match(source, /classes-material-tile--active/);
    assert.doesNotMatch(source, /classes-sidebar-panel--viewer/);
});

test("jitsi meetings keep presence alive for a longer active window", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/api/store.js"),
        "utf8",
    );

    assert.match(source, /ACTIVE_PRESENCE_WINDOW_MS = 5 \* 60 \* 1000/);
});

test("classroom file actions uses onOpen not onMount for file picker", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/ui/classroom-file-actions.js",
        ),
        "utf8",
    );

    assert.match(source, /onOpen:\s*\(overlay\)/);
    assert.doesNotMatch(source, /onMount:\s*\(overlay\)/);
});

test("classroom file actions save popup has no spurious open action", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/ui/classroom-file-actions.js",
        ),
        "utf8",
    );

    assert.doesNotMatch(source, /id:\s*["']open["'],/);
});

test("dedupeFileRefs is defined at module scope in classroom-resource-actions", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/ui/classroom-resource-actions.js",
        ),
        "utf8",
    );

    const dedupeIndex = source.indexOf("function dedupeFileRefs");
    const getMaterialIndex = source.indexOf("export function getMaterialIcon");
    assert.ok(dedupeIndex >= 0, "dedupeFileRefs must be defined");
    assert.ok(getMaterialIndex >= 0, "getMaterialIcon must be defined");
    assert.ok(
        dedupeIndex < getMaterialIndex,
        "dedupeFileRefs must appear before getMaterialIcon at module scope",
    );
});

test("classroom materials file serving route enforces class membership", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/routes/classroom-files-route.ts",
        ),
        "utf8",
    );

    assert.match(source, /materials\\\/files\\\//);
    assert.match(source, /getClassroomResourcesForViewer/);
    assert.match(source, /not_authorized/);
});

test("material preview uses class-scoped file route", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/ui/classroom/material-preview.js",
        ),
        "utf8",
    );

    assert.match(source, /materials\/files\//);
    assert.match(source, /getClassId/);
    assert.match(source, /encodeURIComponent\(classId\)/);
});
