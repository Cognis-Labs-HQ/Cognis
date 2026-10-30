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
    const window = new EventTarget();
    window.scrollY = 0;
    const offsets = new Map();
    const document = {
        documentElement: {
            scrollHeight: 2000,
            style: {
                setProperty: (key, value) => offsets.set(key, value),
                removeProperty: (key) => offsets.delete(key),
            },
        },
        body,
        createElement: () => ({
            dataset: {},
            style: { setProperty() {} },
            querySelector: () => ({
                getBoundingClientRect: () => ({ height: 40 }),
            }),
            setAttribute() {},
            getBoundingClientRect() {
                return { height: this.dataset.collapsed === "true" ? 2 : 40 };
            },
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
    const { createTopBanners, renderTopBanner } = loadTestModule(
        new URL("../top-banners.js", import.meta.url),
        {
            "./escape-html.js": { escapeHtml },
            "./page-styles.js": {
                ensurePersistentStylesheet: async (path) => styles.add(path),
            },
        },
        {
            document,
            console,
            window,
            AbortController,
            ResizeObserver: class {
                observe() {}
                unobserve() {}
                disconnect() {}
            },
        },
    );
    const caller = createTopBanners();
    assert.throws(
        () =>
            caller.publish("invalid", { title: "Notice", collapsible: "yes" }),
        /invalid_banner_collapsible/,
    );
    assert.throws(
        () =>
            renderTopBanner({
                title: "Notice",
                background: "red;display:none",
            }),
        /invalid_banner_background/,
    );
    assert.match(
        renderTopBanner({
            title: "<unsafe>",
            background: "linear-gradient(orange, white)",
        }),
        /&lt;unsafe&gt;/,
    );
    const notice = caller.publish("notify.broadcast", {
        title: "Announcement",
        bodyHtml: "<p>News</p>",
    });
    const scope = new AbortController();
    const offline = caller.publish(
        "ui.offline",
        {
            title: "Offline",
            collapsible: true,
            background: "repeating-linear-gradient(135deg, orange, white 20px)",
            actionsHtml: "<button>Recheck</button>",
        },
        { priority: -100, signal: scope.signal },
    );
    assert.equal(body.children[1], page);
    assert.deepEqual(body.children[0].children, [
        offline.element,
        notice.element,
    ]);
    window.scrollY = 200;
    window.dispatchEvent(new Event("scroll"));
    assert.equal(offline.element.dataset.collapsed, "true");
    assert.equal(notice.element.dataset.collapsed, "false");
    assert.equal(offsets.get("--site-top-banner-height"), "42px");
    document.documentElement.scrollHeight = 1962;
    window.scrollY = 162;
    window.dispatchEvent(new Event("scroll"));
    assert.equal(offline.element.dataset.collapsed, "true");
    window.scrollY = 100;
    window.dispatchEvent(new Event("scroll"));
    assert.equal(offline.element.dataset.collapsed, "false");
    assert.equal(offsets.get("--site-top-banner-height"), "80px");
    assert.match(offline.element.innerHTML, /repeating-linear-gradient/);
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
    assert.equal(offsets.has("--site-top-banner-height"), false);
    window.scrollY = 300;
    window.dispatchEvent(new Event("scroll"));
    assert.equal(offsets.has("--site-top-banner-height"), false);
    assert.equal(styles.has("/static/styles/reuse/top-banners.css"), true);
});
