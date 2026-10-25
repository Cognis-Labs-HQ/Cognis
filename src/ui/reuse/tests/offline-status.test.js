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
const window = new EventTarget();
const root = { querySelector: () => header };
let current;
const header = {
    append: (element) => {
        current = element;
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
        },
        querySelector(selector) {
            const name = selector.slice(1, -1);
            if (!this.innerHTML.includes(name)) return null;
            if (!buttons.has(name))
                buttons.set(name, {
                    addEventListener: (_type, listener) =>
                        buttons.set(name, listener),
                });
            return buttons.get(name);
        },
        click(name) {
            buttons.get(name)();
        },
    };
}
const { mountOfflineStatus } = loadTestModule(
    new URL("../offline-status.js", import.meta.url),
    {
        "./ui-ctx.js": { uiCtx },
        "./offline-state.js": {
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
        "./page-styles.js": { ensurePersistentStylesheet: async () => {} },
    },
    { window, document: { createElement: element }, AbortController, console },
);
const i18n = {
    t: (key) =>
        ({
            "ui.reuse.offline_mode_active": "You are in offline mode",
            "ui.reuse.offline_connection_restored": "Connection restored",
            "ui.reuse.refresh": "Refresh",
            "ui.reuse.dismiss": "Dismiss",
        })[key],
};

test("header status is dismissible, survives remounts, offers guarded refresh after recovery and cleans up", async () => {
    const controller = new AbortController();
    mountOfflineStatus(root, { i18n, signal: controller.signal });
    offline = true;
    window.dispatchEvent(new Event("cognis:connectivity-changed"));
    assert.match(current.innerHTML, /You are in offline mode/);
    assert.doesNotMatch(current.innerHTML, /data-offline-refresh/);
    current.click("data-offline-dismiss");
    assert.equal(current.removed, true);
    mountOfflineStatus(root, { i18n, signal: controller.signal });
    assert.equal(current.removed, true);
    offline = false;
    recovered = true;
    window.dispatchEvent(new Event("cognis:connectivity-changed"));
    assert.match(current.innerHTML, /data-offline-refresh/);
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
