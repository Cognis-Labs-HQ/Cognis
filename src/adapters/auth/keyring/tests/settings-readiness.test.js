import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { KEYRING_RELOCK_OPTIONS } from "../ui/relock-options.js";

function fixture({
    exists = true,
    failure = false,
    initialIdentityChange = false,
} = {}) {
    const window = new EventTarget();
    const controller = new AbortController();
    const notices = [];
    let resolve;
    const pending = new Promise((finish) => {
        resolve = finish;
    });
    const container = {
        innerHTML: "",
        replaceChildren() {
            this.innerHTML = "";
        },
    };
    const root = {
        querySelector: (selector) =>
            selector === "#settings-keyring-manager" ? container : null,
        querySelectorAll: () => [],
    };
    const methods = new Map([
        [
            "ui:pagination",
            {
                bindPaginationControls() {},
                createPagination: () => ({
                    updateData: () => ({ items: [], totalPages: 0 }),
                }),
                renderPaginationControls: () => "",
            },
        ],
        ["keyring:forComponent", () => ({})],
        ["keyring:isUnlocked", () => false],
        ["keyring:getRelockMinutes", () => 0],
        ["keyring:listEvents", () => []],
        [
            "keyring:readState",
            async () => {
                const snapshot = exists;
                if (initialIdentityChange)
                    window.dispatchEvent(
                        new CustomEvent("cognis:keyring-event", {
                            detail: { type: "identityChanged" },
                        }),
                    );
                await pending;
                if (failure) throw new Error("keyring_metadata_unavailable");
                return { exists: snapshot, unlocked: false };
            },
        ],
    ]);
    const { createSettingsSection } = loadTestModule(
        new URL("../ui/settings.js", import.meta.url),
        {
            "/static/reuse/escape-html.js": { escapeHtml: String },
            "/static/reuse/popup.js": {
                openPopup: () =>
                    assert.fail("reading metadata must never open a prompt"),
            },
            "/static/reuse/toast.js": {
                showToast: (message) => notices.push(message),
            },
            "/static/reuse/timestamp.js": { formatDateTime: String },
            "/static/reuse/page-styles.js": {
                ensurePageStylesheet: async () => {},
            },
            "/static/reuse/info-tooltip.js": { renderInfoTooltip: () => "" },
            "/static/reuse/form-builder.js": {
                createFormBuilder: () =>
                    assert.fail("reading metadata must never create a vault"),
            },
            "/static/reuse/ui-ctx.js": { uiCtx: { capabilities: methods } },
            "/static/reuse/secret-visibility-toggle.js": {
                bindSecretVisibilityToggles: () => () => {},
                renderSecretVisibilityField: () => "",
            },
            "./relock-options.js": { KEYRING_RELOCK_OPTIONS },
        },
        { window, AbortController, AbortSignal, console },
    );
    const section = createSettingsSection({
        i18n: { t: (key) => key },
        root,
        signal: controller.signal,
    });
    return {
        section,
        controller,
        window,
        container,
        notices,
        resolve,
        setExists: (value) => {
            exists = value;
        },
    };
}

for (const exists of [true, false])
    test(`first Keyring entry waits for metadata before reporting ${exists ? "locked" : "missing"}`, async () => {
        const host = fixture({ exists, initialIdentityChange: true });
        assert.match(host.section.renderContent(), /ui.reuse.loading/);
        const rendering = host.section.onRender();
        host.resolve();
        await rendering;
        assert.match(
            host.container.innerHTML,
            exists ? /settings-keyring-toggle/ : /settings-keyring-create/,
        );
        assert.deepEqual(host.notices, []);
        host.controller.abort();
    });

test("unavailable metadata is distinct from a genuinely missing keyring", async () => {
    const host = fixture({ failure: true });
    const rendering = host.section.onRender();
    host.resolve();
    await rendering;
    assert.match(host.container.innerHTML, /settings-keyring-retry/);
    assert.deepEqual(host.notices, ["gateway.auth.keyring.unavailable"]);
    host.controller.abort();
});

for (const reason of ["navigation", "identityChanged"])
    test(`late metadata cannot repaint a Keyring section after ${reason}`, async () => {
        const host = fixture();
        const rendering = host.section.onRender();
        if (reason === "navigation") host.controller.abort();
        else
            host.window.dispatchEvent(
                new CustomEvent("cognis:keyring-event", {
                    detail: { type: reason },
                }),
            );
        host.resolve();
        await rendering;
        assert.equal(host.container.innerHTML, "");
        assert.deepEqual(host.notices, []);
    });

test("first entry reads a keyring created after the Settings section was constructed", async () => {
    const host = fixture({ exists: false });
    host.setExists(true);
    const rendering = host.section.onRender();
    host.resolve();
    await rendering;
    assert.match(host.container.innerHTML, /settings-keyring-toggle/);
    assert.deepEqual(host.notices, []);
    host.controller.abort();
});

test("creation and destruction refresh the currently displayed keyring state", async () => {
    const host = fixture({ exists: false });
    host.resolve();
    await host.section.onRender();
    assert.match(host.container.innerHTML, /settings-keyring-create/);
    host.setExists(true);
    host.window.dispatchEvent(
        new CustomEvent("cognis:keyring-event", {
            detail: { type: "created" },
        }),
    );
    await new Promise((resolve) => setImmediate(resolve));
    assert.match(host.container.innerHTML, /settings-keyring-toggle/);
    host.setExists(false);
    host.window.dispatchEvent(
        new CustomEvent("cognis:keyring-event", {
            detail: { type: "destroy" },
        }),
    );
    await new Promise((resolve) => setImmediate(resolve));
    assert.match(host.container.innerHTML, /settings-keyring-create/);
    assert.deepEqual(host.notices, []);
    host.controller.abort();
});
