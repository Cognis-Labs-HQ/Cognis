import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function parseZIndexValue(source, selector) {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
        `${escapedSelector}\\s*\\{[\\s\\S]*?z-index:\\s*(\\d+)`,
    );
    const match = source.match(pattern);
    assert.ok(match, `Expected z-index rule for ${selector}`);
    return Number(match[1]);
}

test("user menu dropdown stacks above notification popups", () => {
    const layoutSource = readFileSync(
        resolve(ROOT, "src/ui/styles/reuse/layout.css"),
        "utf8",
    );
    const popupSource = readFileSync(
        resolve(ROOT, "src/ui/styles/popup.css"),
        "utf8",
    );
    const toastSource = readFileSync(
        resolve(ROOT, "src/ui/styles/reuse/toast.css"),
        "utf8",
    );

    const dropdownZIndex = parseZIndexValue(layoutSource, ".dropdown");
    const popupZIndex = parseZIndexValue(popupSource, ".popup-overlay");
    const toastZIndex = parseZIndexValue(toastSource, ".toast-tray");

    assert.ok(
        dropdownZIndex > popupZIndex,
        "user menu dropdown must render above popup overlays",
    );
    assert.ok(
        dropdownZIndex > toastZIndex,
        "user menu dropdown must render above toast notifications",
    );
});
