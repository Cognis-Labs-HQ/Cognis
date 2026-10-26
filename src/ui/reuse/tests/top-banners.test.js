import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { escapeHtml } from "../escape-html.js";

test("the ctx publisher shares a top-of-page stack, keeps priority and scopes replacement cleanup", async () => {
    const styles = new Set();
    const page = { name: "app" };
    const body = {
        children: [page],
        prepend(element) {
            this.children = [
                element,
                ...this.children.filter((node) => node !== element),
            ];
            element.isConnected = true;
        },
    };
    const document = {
        body,
        createElement: () => ({
            dataset: {},
            isConnected: false,
            replaceChildren(...children) {
                this.children = children;
            },
            remove() {
                body.children = body.children.filter((node) => node !== this);
                this.isConnected = false;
            },
        }),
    };
    const { createTopBanners } = loadTestModule(
        new URL("../top-banners.js", import.meta.url),
        {
            "./escape-html.js": { escapeHtml },
            "./page-styles.js": {
                ensurePersistentStylesheet: async (path) => styles.add(path),
            },
        },
        { document, console },
    );
    const caller = createTopBanners();
    const notice = caller.publish("notify.broadcast", {
        title: "Announcement",
        bodyHtml: "<p>News</p>",
    });
    const scope = new AbortController();
    const offline = caller.publish(
        "ui.offline",
        { title: "Offline", actionsHtml: "<button>Recheck</button>" },
        { priority: -100, signal: scope.signal },
    );
    assert.equal(body.children[1], page);
    assert.deepEqual(body.children[0].children, [
        offline.element,
        notice.element,
    ]);
    const replacement = caller.publish(
        "ui.offline",
        { title: "Recovered", variant: "success" },
        { priority: -100 },
    );
    scope.abort();
    assert.deepEqual(body.children[0].children, [
        replacement.element,
        notice.element,
    ]);
    notice.remove();
    assert.deepEqual(body.children[0].children, [replacement.element]);
    replacement.remove();
    assert.deepEqual(body.children, [page]);
    assert.equal(styles.has("/static/styles/reuse/top-banners.css"), true);
});
