import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

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

test("clear-all notifications button is disabled for empty inboxes", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/notify/internal/ui/navbar-plugin.js"),
        "utf8",
    );
    assert.match(source, /clearAllBtn\.disabled = true;/);
    assert.match(
        source,
        /clearAllBtn\.disabled = currentNotifications\.length === 0;/,
    );
    assert.match(source, /if \(currentNotifications\.length === 0\) return;/);
});
