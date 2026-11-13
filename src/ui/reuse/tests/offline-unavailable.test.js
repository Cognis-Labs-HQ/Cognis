import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { renderInPageCallout } from "../in-page-callout.js";

function fixture({ headerAvailable = true } = {}) {
    let finish;
    let current = true;
    const translations = new Promise((resolve) => {
        finish = resolve;
    });
    const content = { innerHTML: "Old content", dataset: {} };
    const header = {};
    const root = { querySelector: () => content };
    const notices = [];
    const { showOfflineUnavailable } = loadTestModule(
        new URL("../offline-unavailable.js", import.meta.url),
        {
            "./i18n.js": { createI18n: () => translations },
            "./in-page-callout.js": { renderInPageCallout },
            "./offline-state.js": { isOffline: () => true },
            "./offline-status.js": {
                mountOfflineStatus: (owner, options) => {
                    notices.push({ owner, options });
                    return headerAvailable ? () => {} : undefined;
                },
            },
        },
    );
    return {
        root,
        content,
        header,
        notices,
        show: () => showOfflineUnavailable(root, () => current),
        supersede: () => {
            current = false;
            content.innerHTML = "New page";
        },
        finish: () =>
            finish({
                t: (key) =>
                    key === "ui.reuse.offline_mode_active"
                        ? "Offline"
                        : "Unavailable offline",
            }),
    };
}

test("the unavailable view replaces page content and remounts the host notice after page cleanup", async () => {
    const state = fixture();
    const showing = state.show();
    state.finish();
    await showing;
    assert.equal(
        state.content.innerHTML,
        "<div data-offline-unavailable></div>",
    );
    assert.equal(state.notices.length, 1);
    assert.equal(state.notices[0].owner, state.root);
    assert.equal(state.notices[0].options.unavailable, true);
});

test("a delayed offline fallback cannot overwrite a newer navigation", async () => {
    const state = fixture();
    const showing = state.show();
    state.supersede();
    state.finish();
    await showing;
    assert.equal(state.content.innerHTML, "New page");
    assert.equal(state.notices.length, 0);
});

test("a page without a shell header gets one inline unavailable notice", async () => {
    const state = fixture({ headerAvailable: false });
    const showing = state.show();
    state.finish();
    await showing;
    assert.match(state.content.innerHTML, /Unavailable offline/);
    assert.equal(
        (state.content.innerHTML.match(/role="status"/g) ?? []).length,
        1,
    );
});
