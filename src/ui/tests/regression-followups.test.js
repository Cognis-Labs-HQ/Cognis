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
