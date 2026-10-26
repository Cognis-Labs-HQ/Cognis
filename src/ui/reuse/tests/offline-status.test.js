import assert from "node:assert/strict";
import test from "node:test";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { uiCtx } from "../ui-ctx.js";
import { renderInPageCallout } from "../in-page-callout.js";
import { escapeHtml } from "../escape-html.js";

let offline = false;
let recovered = false;
let enabled = true;
let refreshes = 0;
let rechecks = 0;
let finishRecheck;
const window = new EventTarget();
const root = { querySelector: () => header };
let current;
const liveNotices = new Set();
const styles = new Set();
const header = {
    append: (element) => {
        current = element;
        liveNotices.add(element);
    },
};
function element() {
    const buttons = new Map();
    return {
        dataset: {},
        innerHTML: "",
        removed: false,
        remove() {
            this.removed = true;
            liveNotices.delete(this);
        },
        querySelector(selector) {
            const name = selector.slice(1, -1);
            if (!this.innerHTML.includes(name)) return null;
            if (!buttons.has(name))
                buttons.set(name, {
                    addEventListener: (_type, listener) => {
                        buttons.get(name).listener = listener;
                    },
                });
            return buttons.get(name);
        },
        click(name) {
            const button = buttons.get(name);
            return button.listener({ currentTarget: button });
        },
    };
}
const { mountOfflineStatus } = loadTestModule(
    new URL("../offline-status.js", import.meta.url),
    {
        "./ui-ctx.js": { uiCtx },
        "./button-loading.js": {
            beginButtonLoading: (button) => {
                button.disabled = true;
                return () => {
                    button.disabled = false;
                };
            },
        },
        "./offline-state.js": {
            recheckConnectivity: () => {
                rechecks++;
                return new Promise((resolve) => {
                    finishRecheck = resolve;
                });
            },
            isOffline: () => offline,
            offlineEnabled: () => enabled,
            hasRecoveredConnection: () => recovered,
            refreshAfterOffline: () => {
                refreshes++;
                return true;
            },
        },
        "./in-page-callout.js": { renderInPageCallout },
        "./escape-html.js": { escapeHtml },
        "./page-styles.js": {
            ensurePersistentStylesheet: async (path) => styles.add(path),
        },
    },
    { window, document: { createElement: element }, AbortController, console },
);
const i18n = {
    t: (key) =>
        ({
            "ui.reuse.offline_mode_active": "You are in offline mode",
            "ui.reuse.offline_connection_restored": "Connection restored",
            "ui.reuse.refresh": "Refresh",
            "ui.reuse.recheck_connectivity": "Recheck Connectivity",
            "ui.reuse.offline_page_unavailable":
                "This page is not available offline",
        })[key],
};

test("one persistent header status survives remounts, offers styled guarded refresh and cleans up", async () => {
    const controller = new AbortController();
    mountOfflineStatus(root, { i18n, signal: controller.signal });
    offline = true;
    window.dispatchEvent(new Event("cognis:connectivity-changed"));
    assert.match(current.innerHTML, /You are in offline mode/);
    assert.equal((current.innerHTML.match(/<button/g) ?? []).length, 1);
    assert.match(
        current.innerHTML,
        /btn-neutral btn-animated.*data-offline-recheck/,
    );
    assert.equal(liveNotices.size, 1);
    const previous = current;
    mountOfflineStatus(root, { i18n, signal: controller.signal });
    assert.equal(previous.removed, true);
    assert.equal(current.removed, false);
    assert.equal(liveNotices.size, 1);
    offline = false;
    recovered = true;
    window.dispatchEvent(new Event("cognis:connectivity-changed"));
    assert.match(
        current.innerHTML,
        /class="btn-confirm btn-animated" data-offline-refresh/,
    );
    assert.equal((current.innerHTML.match(/<button/g) ?? []).length, 1);
    assert.equal(liveNotices.size, 1);
    assert.ok(styles.has("/static/styles/reuse/buttons.css"));
    assert.equal(refreshes, 0);
    current.click("data-offline-refresh");
    await new Promise(setImmediate);
    assert.equal(refreshes, 1);
    controller.abort();
    const last = current;
    assert.equal(last.removed, true);
    offline = true;
    window.dispatchEvent(new Event("cognis:connectivity-changed"));
    assert.equal(current, last);
});

test("the single header notice includes unavailable-page detail until recovery", () => {
    offline = true;
    recovered = false;
    const dispose = mountOfflineStatus(root, { i18n, unavailable: true });
    assert.equal(liveNotices.size, 1);
    assert.match(current.innerHTML, /This page is not available offline/);
    offline = false;
    recovered = true;
    window.dispatchEvent(new Event("cognis:connection-restored"));
    assert.match(current.innerHTML, /Connection restored/);
    assert.equal((current.innerHTML.match(/<button/g) ?? []).length, 1);
    enabled = false;
    window.dispatchEvent(new Event("cognis:offline-preference-changed"));
    assert.equal(liveNotices.size, 0);
    dispose();
    enabled = true;
});

test("manual recheck participates in its registered flow, stays busy across redraw and permits retry", async () => {
    offline = true;
    recovered = false;
    const dispose = mountOfflineStatus(root, { i18n });
    const checking = current.click("data-offline-recheck");
    await new Promise(setImmediate);
    assert.equal(rechecks, 1);
    window.dispatchEvent(new Event("storage"));
    assert.match(
        current.innerHTML,
        /button-loading.*data-offline-recheck disabled aria-busy="true"/,
    );
    await current.click("data-offline-recheck");
    assert.equal(rechecks, 1);
    finishRecheck(false);
    await checking;
    assert.doesNotMatch(current.innerHTML, /button-loading/);
    const retry = current.click("data-offline-recheck");
    await new Promise(setImmediate);
    assert.equal(rechecks, 2);
    offline = false;
    recovered = true;
    finishRecheck(true);
    await retry;
    assert.match(current.innerHTML, /data-offline-refresh/);
    assert.doesNotMatch(current.innerHTML, /data-offline-recheck/);
    dispose();
});
