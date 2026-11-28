/** Shared real-browser fixture lifecycle, screenshots, and geometry assertions for composer tests. */
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { findChromium, launchChromium } from "../../integration/chromium.js";
import { serveBrowserFixture } from "../../integration/fixture-server.js";

const fixtureDirectory = fileURLToPath(
    new URL("../fixtures/", import.meta.url),
);
const browserEnabled = process.env.COGNIS_BROWSER_TESTS === "1";
const executable = browserEnabled ? findChromium() : null;
export const skip = !browserEnabled
    ? "Set COGNIS_BROWSER_TESTS=1 to run real Chromium responsive integration tests."
    : !executable
      ? "Chromium is not installed. Set COGNIS_TEST_CHROMIUM to its executable."
      : false;
/** expectedElementCount accounts for deliberately hidden fixture elements; default fixtures require every declared element. */
export async function startFixture(
    context,
    suffix = "",
    viewport = [1440, 900],
    serverOptions = {},
    expectedElementCount,
) {
    const server = await serveBrowserFixture(fixtureDirectory, serverOptions);
    context.after(() => server.close());
    const browser = await launchChromium(executable);
    context.after(() => browser.close());
    await browser.resize(...viewport);
    await browser.command("Page.navigate", { url: server.url + suffix });
    await browser.waitFor("Boolean(window.fixture)");
    assert.equal(await browser.evaluate("window.fixture.error ?? null"), null);
    await browser.waitFor(
        `document.querySelectorAll("[data-composer-element]").length === ${expectedElementCount ?? "window.fixture.elementCount"}`,
    );
    await browser.evaluate(
        `document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))`,
    );
    return { browser, server };
}

export async function rectangles(browser, selector) {
    return browser.callFunction(
        `function(selector) { return Array.from(document.querySelectorAll(selector), element => {
    const bounds = element.getBoundingClientRect();
    const parentStyle = getComputedStyle(element.parentElement);
    return {
      left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom,
      width: bounds.width, height: bounds.height,
      parentWidth: element.parentElement.clientWidth - parseFloat(parentStyle.paddingLeft) - parseFloat(parentStyle.paddingRight),
      compact: Boolean(element.closest('.composer-view-grid--compact, .sub-composer--compact')),
      clientHeight: element.clientHeight, scrollHeight: element.scrollHeight,
      id: element.dataset.composerElement ?? element.id,
    };
  }); }`,
        [selector],
    );
}

export function assertHorizontallyContained(bounds, width, label) {
    assert.ok(bounds.width > 0, `${label} has positive width`);
    assert.ok(
        bounds.left >= -1,
        `${label} left ${bounds.left} is inside viewport`,
    );
    assert.ok(
        bounds.right <= width + 1,
        `${label} right ${bounds.right} is inside ${width}px viewport`,
    );
}

export async function assertNoDocumentOverflow(browser, width) {
    const scrollWidth = await browser.evaluate(
        "document.documentElement.scrollWidth",
    );
    assert.ok(
        scrollWidth <= width + 1,
        `Document is ${scrollWidth}px wide in a ${width}px viewport`,
    );
}
