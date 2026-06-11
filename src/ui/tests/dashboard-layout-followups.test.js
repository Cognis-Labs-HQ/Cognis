import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();

test("dashboard layout applies scroll hysteresis for sub-navigation priority", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    assert.match(source, /SUBNAV_PRIORITY_ENTER_SCROLL_Y\s*=\s*20/);
    assert.match(source, /SUBNAV_PRIORITY_EXIT_SCROLL_Y\s*=\s*6/);
});

test("dashboard layout unhides global chat toggle on initial render when enabled", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    assert.match(
        source,
        /root\.querySelector\("#global-chat-toggle"\)\?\.removeAttribute\("hidden"\)/,
    );
});
