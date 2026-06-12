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
    const source = readFileSync(
        resolve(ROOT, "src/adapters/study/classes/ui/classroom/index.js"),
        "utf8",
    );

    assert.match(source, /isClassSearchDetached/);
    assert.match(source, /if \(!isClassSearchDetached\)/);
    assert.match(source, /teacherActiveInMeeting/);
    assert.match(source, /activeParticipants\.some/);
    assert.match(source, /return workspaceMode;/);
    assert.doesNotMatch(
        source,
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

test("classroom resources route supports agenda document and snapshots", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/routes/classroom-agenda-route.ts",
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
    assert.match(source, /getClassesForTeacher/);
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
});
