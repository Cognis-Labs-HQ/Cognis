import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderInfoTooltip } from "../reuse/info-tooltip.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("renderInfoTooltip outputs id-based tooltip buttons without inline panels", () => {
    const tooltipMarkup = renderInfoTooltip(
        "Sensitive Tooltip Text",
        "More information",
        "security-tooltip",
    );
    assert.match(
        tooltipMarkup,
        /data-info-tooltip-id="security-tooltip"/,
        "tooltip markup should include a stable tooltip id reference",
    );
    assert.doesNotMatch(
        tooltipMarkup,
        /info-tooltip__panel/,
        "tooltip markup should not include inline panel nodes",
    );
    assert.doesNotMatch(
        tooltipMarkup,
        /Sensitive Tooltip Text/,
        "tooltip text should not be embedded into the DOM markup",
    );
});

test("info-tooltip styles use viewport-level fixed positioning", () => {
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
