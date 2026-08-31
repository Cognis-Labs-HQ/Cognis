import test from "node:test";
import assert from "node:assert/strict";
import {
    ensurePersistentStylesheet,
    preparePageStylesheets,
} from "../page-styles.js";

test("persistent shell styles survive page stylesheet reconciliation", async (testContext) => {
    const availabilityStylesheet = {
        dataset: { pageStylesheet: "true" },
        href: "http://localhost/static/adapters/social/profile/availability.css",
        rel: "stylesheet",
        removed: false,
        sheet: {},
        remove() {
            this.removed = true;
        },
    };
    globalThis.window = { location: { origin: "http://localhost" } };
    globalThis.document = {
        head: {
            querySelector(selector) {
                return selector.includes("availability.css")
                    ? availabilityStylesheet
                    : null;
            },
            querySelectorAll() {
                return availabilityStylesheet.removed
                    ? []
                    : [availabilityStylesheet];
            },
        },
    };
    testContext.after(() => {
        delete globalThis.document;
        delete globalThis.window;
    });

    const commitInitialStyles = await preparePageStylesheets([
        "/static/adapters/social/profile/availability.css",
    ]);
    commitInitialStyles();
    await ensurePersistentStylesheet(
        "/static/adapters/social/profile/availability.css",
    );
    const commitNextPageStyles = await preparePageStylesheets([]);
    commitNextPageStyles();

    assert.equal(availabilityStylesheet.removed, false);
    assert.equal(availabilityStylesheet.dataset.pageStylesheet, undefined);
});
