import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("runtime error popup renders branded header and supports previous-route fallback", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/runtime-error-popup.js"),
        "utf8",
    );

    assert.match(source, /popup-error-report-brand/);
    assert.match(source, /\/static\/assets\/icons\/cognis-icon\.png/);
    assert.match(source, /navigateToPreviousRouteIfDifferent/);
    assert.match(source, /window\.history\.state\?\.previousRouterPage/);
});

test("popup styles constrain dialog height and apply themed scrollbars", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/styles/popup.css"),
        "utf8",
    );

    assert.match(source, /max-height:\s*calc\(100dvh - 48px\);/);
    assert.match(
        source,
        /\.popup-overlay,\s*[\s\S]*\.popup-overlay \*\s*\{\s*scrollbar-color:/m,
    );
    assert.match(source, /\.popup-error-report-brand\s*\{/);
});

test("router stores previous route in history state during SPA navigation", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );

    assert.match(source, /previousRouterPage/);
    assert.match(
        source,
        /history\.pushState\(\{\s*routerPage:\s*path,\s*previousRouterPage\s*\},\s*["']["'],\s*path\)/,
    );
});
