import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("info-tooltip runtime renders through viewport-level overlay", () => {
    const tooltipModuleSource = readFileSync(
        resolve(ROOT, "src/ui/reuse/info-tooltip.js"),
        "utf8",
    );
    assert.match(
        tooltipModuleSource,
        /id = "info-tooltip-overlay"/,
        "info-tooltip runtime should create a shared overlay node",
    );
    assert.match(
        tooltipModuleSource,
        /window\.addEventListener\("scroll", hideInfoTooltip, true\)/,
        "info-tooltip runtime should hide overlays during scroll to avoid stale positions",
    );

    const tooltipStylesSource = readFileSync(
        resolve(ROOT, "src/ui/styles/reuse/info-tooltip.css"),
        "utf8",
    );
    assert.match(
        tooltipStylesSource,
        /\.info-tooltip-overlay\s*\{[\s\S]*position:\s*fixed;/,
        "tooltip overlay should use fixed positioning to avoid container clipping",
    );
});
