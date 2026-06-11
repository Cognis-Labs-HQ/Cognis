import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();

test("classroom render includes workspace tabs and roster panel", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/study/classes/ui/classroom-render.js"),
        "utf8",
    );

    assert.match(source, /classes-workspace-tab-btn/);
    assert.match(source, /classes-roster-panel/);
    assert.match(source, /members_present/);
    assert.match(source, /members_absent/);
    assert.doesNotMatch(source, /mode:\s*"roster"/);
    assert.match(source, /classes-notepad-host/);
    assert.match(source, /classes-meeting-workspace-host/);
});

test("classroom whiteboard actions support inline and pop-out modes", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/ui/classroom-whiteboard-actions.js",
        ),
        "utf8",
    );

    assert.match(source, /classes-open-whiteboards-btn/);
    assert.match(source, /classes-inline-whiteboard-popout-btn/);
    assert.match(source, /classes-popout-whiteboard-btn/);
    assert.match(source, /setWorkspaceMode\("whiteboard"\)/);
    assert.match(source, /persistActiveWhiteboardId/);
});

test("classroom render gates student meeting and whiteboard controls", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/study/classes/ui/classroom-render.js"),
        "utf8",
    );

    assert.match(source, /canAccessWhiteboard/);
    assert.match(source, /activeWhiteboardId/);
    assert.match(source, /classes-blackboard-body/);
});
