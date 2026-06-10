import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();

test("classroom render includes workspace tabs and live rail", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/adapters/study/classes/ui/classroom-render.js",
        ),
        "utf8",
    );

    assert.match(source, /classes-workspace-tab-btn/);
    assert.match(source, /classes-live-rail/);
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
});
