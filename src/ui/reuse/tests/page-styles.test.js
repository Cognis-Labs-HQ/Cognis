import test from "node:test";
import assert from "node:assert/strict";
import {
    ensurePersistentStylesheet,
    preparePageStylesheets,
} from "../page-styles.js";

function createStylesheet(pathname) {
    return {
        dataset: { pageStylesheet: "true" },
        href: `http://localhost${pathname}`,
        rel: "stylesheet",
        removed: false,
        sheet: {},
        remove() {
            this.removed = true;
        },
    };
}

test("route and shared styles survive SPA navigation", async (testContext) => {
    const buttonStylesheet = createStylesheet(
        "/static/styles/reuse/buttons.css",
    );
    const meetingsStylesheet = createStylesheet(
        "/static/modules/jitsi-meet/jitsi-meet.css",
    );
    const stylesheets = [buttonStylesheet, meetingsStylesheet];
    globalThis.window = { location: { origin: "http://localhost" } };
    globalThis.document = {
        head: {
            querySelector(selector) {
                return stylesheets.find(
                    (stylesheet) =>
                        !stylesheet.removed &&
                        selector.includes(new URL(stylesheet.href).pathname),
                );
            },
            querySelectorAll() {
                return stylesheets.filter((stylesheet) => !stylesheet.removed);
            },
        },
    };
    testContext.after(() => {
        delete globalThis.document;
        delete globalThis.window;
    });

    const commitMeetingsStyles = await preparePageStylesheets([
        "/static/styles/reuse/buttons.css",
        "/static/modules/jitsi-meet/jitsi-meet.css",
    ]);
    commitMeetingsStyles();
    await ensurePersistentStylesheet("/static/styles/reuse/buttons.css");
    const commitNextPageStyles = await preparePageStylesheets([]);
    commitNextPageStyles();

    assert.equal(buttonStylesheet.removed, false);
    assert.equal(buttonStylesheet.dataset.pageStylesheet, "true");
    assert.equal(meetingsStylesheet.removed, false);
});

test("versioned route styles are reused after navigation", async (testContext) => {
    const pageBuilderPath = "/static/styles/page-builder.css?v=development";
    const stylesheets = [createStylesheet(pageBuilderPath)];
    let appendedStylesheets = 0;
    globalThis.window = { location: { origin: "http://localhost" } };
    globalThis.document = {
        createElement() {
            const listeners = new Map();
            return {
                dataset: {},
                addEventListener(type, listener) {
                    listeners.set(type, listener);
                },
                dispatchLoad() {
                    listeners.get("load")?.();
                },
            };
        },
        head: {
            appendChild(stylesheet) {
                appendedStylesheets += 1;
                stylesheet.href = new URL(
                    stylesheet.href,
                    window.location.origin,
                ).href;
                stylesheet.remove = () => {
                    stylesheet.removed = true;
                };
                stylesheets.push(stylesheet);
                stylesheet.dispatchLoad();
            },
            querySelectorAll() {
                return stylesheets.filter((stylesheet) => !stylesheet.removed);
            },
        },
    };
    testContext.after(() => {
        delete globalThis.document;
        delete globalThis.window;
    });

    const commitMeetingsStyles = await preparePageStylesheets([
        pageBuilderPath,
    ]);
    commitMeetingsStyles();
    const commitWithoutPageBuilder = await preparePageStylesheets([]);
    commitWithoutPageBuilder();
    await preparePageStylesheets([pageBuilderPath]);

    assert.equal(appendedStylesheets, 0);
});
