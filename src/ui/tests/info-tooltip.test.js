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
        /data-info-tooltip-id="security-tooltip-\d+"/,
        "tooltip markup should include a unique tooltip id reference",
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
    const selectorIndex = tooltipStylesSource.indexOf(".info-tooltip-overlay");
    assert.notEqual(
        selectorIndex,
        -1,
        "tooltip stylesheet should define .info-tooltip-overlay styles",
    );
    const blockStartIndex = tooltipStylesSource.indexOf("{", selectorIndex);
    const blockEndIndex = tooltipStylesSource.indexOf("}", blockStartIndex);
    const overlayRuleBlock = tooltipStylesSource.slice(
        blockStartIndex,
        blockEndIndex,
    );
    assert.equal(
        overlayRuleBlock.includes("position: fixed;"),
        true,
        "tooltip overlay should use fixed positioning to avoid container clipping",
    );
});
