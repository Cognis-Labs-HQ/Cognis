import test from "node:test";
import assert from "node:assert/strict";

function createStylesheetDocument() {
    const links = [];
    const head = {
        querySelector(selector) {
            const href = selector.match(/href="([^"]+)"/)?.[1];
            return links.find((link) => link.href === href) ?? null;
        },
        querySelectorAll(selector) {
            if (selector.includes("data-page-stylesheet")) {
                return links.filter(
                    (link) => link.dataset.pageStylesheet === "true",
                );
            }
            return [...links];
        },
        appendChild(link) {
            links.push(link);
            link.sheet = {};
            queueMicrotask(() => link.listeners.get("load")?.());
        },
    };
    return {
        document: {
            head,
            createElement() {
                return {
                    dataset: {},
                    href: "",
                    listeners: new Map(),
                    rel: "",
                    sheet: null,
                    addEventListener(type, listener) {
                        this.listeners.set(type, listener);
                    },
                    remove() {
                        const index = links.indexOf(this);
                        if (index >= 0) links.splice(index, 1);
                    },
                };
            },
        },
        links,
    };
}

test("capability styles survive route stylesheet reconciliation", async () => {
    const priorDocument = globalThis.document;
    const priorWindow = globalThis.window;
    const stylesheetDom = createStylesheetDocument();
    globalThis.document = stylesheetDom.document;
    globalThis.window = { location: { origin: "https://cognis.test" } };
    try {
        const pageStyles = await import(`../page-styles.js?test=${Date.now()}`);
        await pageStyles.ensurePageStylesheet("/profile-availability.css");
        const commitMeetingsStyles = await pageStyles.preparePageStylesheets([
            "/meetings.css",
        ]);
        commitMeetingsStyles();
        const commitMessagesStyles = await pageStyles.preparePageStylesheets([
            "/messages.css",
        ]);
        commitMessagesStyles();

        assert.deepEqual(stylesheetDom.links.map((link) => link.href).sort(), [
            "/messages.css",
            "/profile-availability.css",
        ]);
        assert.equal(
            stylesheetDom.links.find(
                (link) => link.href === "/profile-availability.css",
            )?.dataset.pageStylesheet,
            undefined,
        );
    } finally {
        globalThis.document = priorDocument;
        globalThis.window = priorWindow;
    }
});
