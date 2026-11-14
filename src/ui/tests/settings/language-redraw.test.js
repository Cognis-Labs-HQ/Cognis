import assert from "node:assert/strict";
import test from "node:test";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { createOfflineClientFixture } from "../../../tooling/reuse/offline-client-fixture.js";
import { registerPageRedraw } from "../../reuse/page-redraw.js";

function setup(context, { fail = false } = {}) {
    context.mock.timers.enable({ apis: ["setTimeout"] });
    const window = new EventTarget();
    const host = createOfflineClientFixture(() => assert.fail("no HTTP"));
    context.after(() => host.controller.abort());
    const errors = [],
        toasts = [],
        mounts = [],
        choices = [],
        attempts = [];
    const globals = {
        window,
        setTimeout,
        clearTimeout,
        console: { error: (...args) => errors.push(args) },
    };
    const { createUnsavedChangesBar } = loadTestModule(
        new URL("../../reuse/unsaved-changes.js", import.meta.url),
        {
            "./escape-html.js": { escapeHtml: (value) => value },
            "./i18n.js": { createI18n: () => assert.fail("injected decision") },
        },
        globals,
    );
    registerPageRedraw(host.ctx, {
        currentPath: () => "/settings",
        resolveRoute: async () => ({ id: "settings" }),
        allowOfflineRoute: async () => true,
        requestNavigation: (path, resume) => {
            const event = new Event("cognis:route-before-navigate", {
                cancelable: true,
            });
            event.detail = { path, resume };
            return window.dispatchEvent(event);
        },
        mount: async () => {
            mounts.push("settings");
            return true;
        },
    });
    const { createLanguageRedraw } = loadTestModule(
        new URL("../../app/settings/language-redraw.js", import.meta.url),
        {
            "../../reuse/ui-language-catalog.js": {
                changeUiLanguage: async (locale) => {
                    attempts.push(locale);
                    if (fail) throw new Error("catalog_unavailable");
                    return host.ctx.capabilities.get("ui:redraw")({
                        prepare: () => {
                            choices.push(locale);
                        },
                    });
                },
            },
            "../../reuse/offline-identity.js":
                host.imports["/static/reuse/offline-identity.js"],
            "../../reuse/toast.js": {
                showToast: (...args) => toasts.push(args),
            },
        },
        globals,
    );
    const schedule = createLanguageRedraw({
        signal: host.controller.signal,
        i18n: { t: (key) => key },
    });
    return {
        host,
        schedule,
        createUnsavedChangesBar,
        mounts,
        choices,
        errors,
        toasts,
        attempts,
    };
}

test("Settings Save completes before the delayed redraw and protects edits made during its two-second delay", async (context) => {
    const fixture = setup(context);
    let save;
    const decisions = [];
    const bar = fixture.createUnsavedChangesBar(
        {
            querySelector: (selector) =>
                selector.includes("save")
                    ? {
                          addEventListener: (_name, callback) => {
                              save = callback;
                          },
                      }
                    : null,
        },
        {
            onSave: async () => fixture.schedule("de"),
            openConfirmation: async () => {
                decisions.push("confirm");
                return "stay";
            },
        },
    );
    context.after(() => bar.destroy());
    bar.markDirty("language", true);
    await save();
    assert.equal(bar.isAnyDirty(), false);
    context.mock.timers.tick(1999);
    assert.deepEqual(fixture.choices, []);
    bar.markDirty("theme", true);
    context.mock.timers.tick(1);
    await new Promise(setImmediate);
    assert.deepEqual(decisions, ["confirm"]);
    assert.deepEqual(fixture.choices, []);
    assert.deepEqual(fixture.mounts, []);
    assert.equal(bar.isAnyDirty(), true);
});

test("saved language redraw coalesces repeated saves and cancels on unmount", async (context) => {
    const fixture = setup(context);
    fixture.schedule("de");
    context.mock.timers.tick(1000);
    fixture.schedule("ja");
    context.mock.timers.tick(1999);
    assert.deepEqual(fixture.mounts, []);
    context.mock.timers.tick(1);
    await new Promise(setImmediate);
    assert.deepEqual(fixture.choices, ["ja"]);
    assert.deepEqual(fixture.mounts, ["settings"]);
    fixture.schedule("de");
    fixture.host.controller.abort();
    context.mock.timers.tick(2000);
    assert.deepEqual(fixture.choices, ["ja"]);
});

test("delayed redraw reports failures and cannot apply a prior account's saved language", async (context) => {
    const fixture = setup(context, { fail: true });
    fixture.schedule("de");
    context.mock.timers.tick(2000);
    await new Promise(setImmediate);
    assert.equal(fixture.errors.length, 1);
    assert.equal(fixture.toasts[0][0], "ui.reuse.error");
    assert.equal(fixture.toasts[0][1].variant, "error");
    fixture.schedule("ja");
    fixture.host.changeAccount("other");
    context.mock.timers.tick(2000);
    await new Promise(setImmediate);
    assert.equal(fixture.errors[1][1].errorName, "Error");
    assert.deepEqual(fixture.choices, []);
    assert.deepEqual(fixture.attempts, ["de"]);
});
