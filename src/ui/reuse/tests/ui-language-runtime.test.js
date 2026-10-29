import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { createOfflineClientFixture } from "../../../tooling/reuse/offline-client-fixture.js";
import { registerPageRedraw } from "../page-redraw.js";
import { installI18nEnvironment } from "./fixtures/i18n-environment.js";

function languageState() {
    const values = new Map([
        ["cognis_account", "learner"],
        ["cognis_access_token", "session"],
        [
            "cognis_ui_preferences",
            JSON.stringify({ languagePriority: ["en", "de", "ja"] }),
        ],
    ]);
    const globals = {
        localStorage: { getItem: (key) => values.get(key) ?? null },
        console,
    };
    return {
        values,
        state: loadTestModule(
            new URL("../ui-language-state.js", import.meta.url),
            {},
            globals,
        ),
    };
}

test("active locale selection preserves configured membership and order and is isolated by account/session", () => {
    const { values, state } = languageState();
    const before = values.get("cognis_ui_preferences");
    const rollback = state.selectUiLanguage("de");
    assert.equal(state.activeUiLanguage(), "de");
    assert.equal(values.get("cognis_ui_preferences"), before);
    assert.throws(
        () => state.selectUiLanguage("id"),
        /ui_language_not_enabled/,
    );
    rollback();
    assert.equal(state.activeUiLanguage(), undefined);
    state.selectUiLanguage("ja");
    values.set("cognis_access_token", "another-session");
    assert.equal(state.activeUiLanguage(), undefined);
    values.set("cognis_account", "another-account");
    assert.equal(state.activeUiLanguage(), undefined);
    assert.equal(
        state.uiLanguageMembershipChanged(
            { languagePriority: ["en", "de"] },
            { languagePriority: ["de", "en"] },
        ),
        false,
    );
    assert.equal(
        state.uiLanguageMembershipChanged(
            { languagePriority: ["en", "de"] },
            { languagePriority: ["en", "ja"] },
        ),
        true,
    );
});

test("guarded redraw defers locale preparation for unsaved edits, keeps history unchanged and rolls back a failed mount", async (context) => {
    const host = createOfflineClientFixture(() =>
        assert.fail("no HTTP needed"),
    );
    context.after(() => host.controller.abort());
    let path = "/dashboard",
        confirmed = false,
        resume,
        prepared = 0,
        mounts = 0,
        rolledBack = 0;
    registerPageRedraw(host.ctx, {
        currentPath: () => path,
        resolveRoute: async () => ({ id: "dashboard" }),
        allowOfflineRoute: async () => true,
        requestNavigation: (_path, callback) => {
            resume = callback;
            return confirmed;
        },
        mount: async (route) => {
            assert.equal(route, path);
            mounts++;
            return mounts < 2;
        },
    });
    const redraw = host.ctx.capabilities.get("ui:redraw");
    assert.equal(
        await redraw({
            prepare: () => {
                prepared++;
                return () => rolledBack++;
            },
        }),
        false,
    );
    assert.equal(prepared, 0);
    confirmed = true;
    resume();
    await new Promise(setImmediate);
    assert.equal(prepared, 1);
    assert.equal(mounts, 1);
    assert.equal(path, "/dashboard");
    assert.equal(await redraw({ prepare: () => () => rolledBack++ }), false);
    assert.equal(rolledBack, 1);
    path = "/study";
    assert.equal(
        await redraw({
            path: "/dashboard",
            prepare: () => assert.fail("stale redraw"),
        }),
        false,
    );
});

test("enabled component strings are warmed and active-language redraw resolves locally with English fallback", async () => {
    let disconnected = false;
    const host = installI18nEnvironment((path) => {
        assert.equal(disconnected, false, `offline request: ${path}`);
        const german = path.includes("/de/");
        const component = path.startsWith("/static/component/");
        return new Response(
            `<resources><string name="${component ? "title" : "core"}">${german ? "Deutsch" : "English"}</string>${german ? "" : '<string name="fallback">English fallback</string>'}</resources>`,
        );
    });
    host.storage.set("cognis_account", "language-test");
    host.storage.set(
        "cognis_ui_preferences",
        JSON.stringify({ languagePriority: ["en", "de"] }),
    );
    const i18n = await import(`../i18n.js?test=${crypto.randomUUID()}`);
    const state = await import("../ui-language-state.js");
    await i18n.prepareUiLanguages();
    const before = await i18n.createI18n({
        componentStringBaseUrls: ["/static/component/languages"],
        persistLocale: false,
        preferredLanguages: ["en"],
    });
    assert.equal(before.t("title"), "English");
    const requests = host.requests.length;
    disconnected = true;
    state.selectUiLanguage("de");
    const after = await i18n.createI18n({
        componentStringBaseUrls: ["/static/component/languages"],
    });
    assert.equal(after.locale, "de");
    assert.equal(after.t("title"), "Deutsch");
    assert.equal(after.t("fallback"), "English fallback");
    assert.throws(() => after.t("missing"), {
        code: "missing_translation",
        key: "missing",
    });
    assert.equal(host.requests.length, requests);
});

test("language shortcut commits after two seconds, coalesces clicks and releases replaced bindings", async (context) => {
    context.mock.timers.enable({ apis: ["setTimeout"] });
    const handlers = new Map();
    const toggle = {
        hidden: false,
        replaceChildren() {},
        append() {},
        setAttribute() {},
        addEventListener(name, callback, { signal }) {
            handlers.set(name, callback);
            signal.addEventListener(
                "abort",
                () => {
                    if (handlers.get(name) === callback) handlers.delete(name);
                },
                { once: true },
            );
        },
    };
    const selected = [];
    const globals = {
        document: { querySelector: () => toggle, createElement: () => ({}) },
        window: new EventTarget(),
        AbortController,
        setTimeout,
        clearTimeout,
        console,
    };
    const client = loadTestModule(
        new URL("../language-toggle.js", import.meta.url),
        {
            "./ui-language-catalog.js": {
                loadUiLanguageCatalog: async () =>
                    ["en", "de", "ja"].map((iso_code) => ({
                        iso_code,
                        name: iso_code,
                        flag: `/static/assets/flags/${iso_code}.svg`,
                    })),
                changeUiLanguage: async (code) => {
                    selected.push(code);
                    return true;
                },
            },
            "./ui-language-state.js": { activeUiLanguage: () => "en" },
            "./i18n.js": { readPreferredLanguages: () => ["en", "de", "ja"] },
            "./ui-preferences.js": {
                loadUiPreferences: () =>
                    assert.fail("supplied preferences must be reused"),
            },
        },
        globals,
    );
    const options = {
        i18n: { locale: "en", t: (key) => key },
        preferences: { languagePriority: ["en", "de", "ja"] },
        showToast: () => assert.fail("no error toast"),
        navigateTo: () => {},
    };
    await client.bindLanguageToggle(options);
    handlers.get("click")();
    context.mock.timers.tick(1999);
    assert.deepEqual(selected, []);
    handlers.get("click")();
    context.mock.timers.tick(1999);
    assert.deepEqual(selected, []);
    context.mock.timers.tick(1);
    await Promise.resolve();
    assert.deepEqual(selected, ["ja"]);
    handlers.get("click")();
    await client.bindLanguageToggle(options);
    context.mock.timers.tick(2000);
    assert.deepEqual(selected, ["ja"]);
});

test("offline language tables allow selected reordering, block membership changes and unlock Available online", async () => {
    let disconnected = true;
    const handlers = new Map();
    class Element {
        constructor(id = "") {
            this.id = id;
            this.attributes = new Map();
            this.children = [];
            this.classList = { add() {}, remove() {} };
        }
        setAttribute(name, value) {
            this.attributes.set(name, value);
        }
        getAttribute(name) {
            return this.attributes.get(name);
        }
        append(...children) {
            this.children.push(...children);
        }
        replaceChildren(...children) {
            this.children = children;
            children.forEach((child) => (child.parentElement = this));
        }
        addEventListener() {}
        closest(selector) {
            if (
                selector.includes("tr[data-lang-row]") &&
                this.attributes.has("data-lang-row")
            )
                return this;
            if (this.id && selector.includes(`#${this.id}`)) return this;
            return this.parentElement?.closest(selector) ?? null;
        }
        getBoundingClientRect() {
            return { top: 0, height: 20, bottom: 20 };
        }
    }
    const preferred = new Element("preferred-languages"),
        available = new Element("available-languages");
    const window = new EventTarget();
    const root = {
        querySelector: (selector) =>
            selector === "#preferred-languages" ? preferred : available,
        querySelectorAll: () => [],
        addEventListener: (name, callback) => handlers.set(name, callback),
    };
    const { initLanguagePrefs } = loadTestModule(
        new URL("../../app/settings/language-prefs.js", import.meta.url),
        {
            "../../reuse/offline-state.js": { isOffline: () => disconnected },
            "../../reuse/ui-language-catalog.js": {
                loadUiLanguageCatalog: async () =>
                    ["en", "de", "ja"].map((iso_code) => ({
                        iso_code,
                        name: iso_code,
                    })),
            },
            "../../reuse/i18n.js": {
                sanitizeLanguagePriority: (value) => value,
                readBrowserLocales: () => ["ja"],
            },
        },
        { window, document: { createElement: () => new Element() } },
    );
    const scope = new AbortController();
    const controller = initLanguagePrefs(root, ["en", "de"], {
        signal: scope.signal,
    });
    await controller.init();
    assert.equal(available.getAttribute("aria-disabled"), "true");
    assert.equal(available.children[0].getAttribute("draggable"), "false");
    assert.equal(preferred.children[0].getAttribute("draggable"), "true");
    const drop = (language, target) =>
        handlers.get("drop")({
            target,
            clientX: 0,
            clientY: 0,
            preventDefault() {},
            dataTransfer: { getData: () => language },
        });
    drop("de", preferred.children[0]);
    assert.deepEqual(Array.from(controller.getPriority()), ["de", "en"]);
    drop("ja", preferred.children[0]);
    assert.deepEqual(Array.from(controller.getPriority()), ["de", "en"]);
    drop("de", available);
    assert.deepEqual(Array.from(controller.getPriority()), ["de", "en"]);
    controller.syncFromBrowser();
    assert.deepEqual(Array.from(controller.getPriority()), ["de", "en"]);
    disconnected = false;
    window.dispatchEvent(new Event("cognis:connectivity-changed"));
    assert.equal(available.getAttribute("aria-disabled"), "false");
    assert.equal(available.children[0].getAttribute("draggable"), "true");
    scope.abort();
});
