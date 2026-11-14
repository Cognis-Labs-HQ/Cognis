import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

function fixture() {
    const values = new Map([
        ["cognis_account", "learner"],
        ["cognis_access_token", "session"],
    ]);
    const writes = [];
    const events = [];
    const window = new EventTarget();
    window.addEventListener("cognis:offline-preference-changed", () =>
        events.push("offline"),
    );
    let duringRead = () => {};
    let offline = false;
    const globals = {
        localStorage: {
            getItem: (key) => values.get(key) ?? null,
            setItem: (key, value) => values.set(key, value),
        },
        window,
        CustomEvent: Event,
        document: {
            documentElement: { dataset: {}, style: { setProperty() {} } },
        },
        JSON,
        Error,
    };
    const guard = loadTestModule(
        new URL("../offline-identity.js", import.meta.url),
        {},
        globals,
    );
    const prefs = loadTestModule(
        new URL("../ui-preferences.js", import.meta.url),
        {
            "./offline-state.js": {
                offlineEnabled: () => true,
                isOffline: () => offline,
            },
            "./ui-language-state.js": loadTestModule(
                new URL("../ui-language-state.js", import.meta.url),
                {},
                globals,
            ),
            "./offline-identity.js": guard,
            "./message-style-options.js": {
                normalizeMessageStyle: (value) => value,
            },
            "./api-client.js": {
                apiFetch: () => assert.fail("Use the scoped Profile client"),
            },
            "./ui-ctx.js": {
                uiCtx: {
                    capabilities: {
                        get:
                            () =>
                            async (_path, options = {}) => {
                                if (options.method === "PUT")
                                    writes.push(JSON.parse(options.body));
                                else duringRead();
                                return Response.json({
                                    data: {
                                        layoutJson: JSON.stringify({
                                            timezone: "UTC",
                                            mode: "dark",
                                        }),
                                    },
                                });
                            },
                    },
                },
            },
        },
        globals,
    );
    return {
        prefs,
        values,
        writes,
        events,
        disconnect: () => {
            offline = true;
        },
        duringRead: (callback) => {
            duringRead = callback;
        },
    };
}

test("UI preference changes use the buffered Profile contract and retain existing fields", async () => {
    const state = fixture();
    await state.prefs.saveUiPreferences({ mode: "light" });
    assert.deepEqual(state.writes, [
        { layout: { timezone: "UTC", mode: "light" } },
    ]);
});

test("a delayed preference merge cannot write across an account switch", async () => {
    const state = fixture();
    state.duringRead(() => state.values.set("cognis_account", "another-user"));
    await assert.rejects(
        state.prefs.saveUiPreferences({ mode: "light" }),
        /offline_account_changed/,
    );
    assert.equal(state.writes.length, 0);
});

test("saving unchanged UI preferences leaves the buffered write contract idle", async () => {
    const state = fixture();
    await state.prefs.saveUiPreferences({ mode: "dark", timezone: "UTC" });
    assert.equal(state.writes.length, 0);
});

test("binding the first same-account offline preference preserves already prepared snapshots", () => {
    const state = fixture();
    state.prefs.applyUiPreferences({ offlineEnabled: true });
    assert.equal(
        state.values.get("cognis_offline_preference_account"),
        "learner",
    );
    assert.equal(state.events.length, 0);
    state.prefs.applyUiPreferences({ offlineEnabled: false });
    assert.equal(state.events.length, 1);
    state.values.set("cognis_account", "another-user");
    state.prefs.applyUiPreferences({ offlineEnabled: true });
    assert.equal(state.events.length, 2);
});

test("offline UI preferences accept reordering but reject enabled-language membership changes", async () => {
    const state = fixture();
    state.values.set(
        "cognis_ui_preferences",
        JSON.stringify({ languagePriority: ["en", "de"] }),
    );
    state.disconnect();
    await state.prefs.saveUiPreferences({
        languagePriority: ["de", "en"],
        languagePriorityMode: "manual",
    });
    assert.equal(state.writes.length, 1);
    await assert.rejects(
        state.prefs.saveUiPreferences({ languagePriority: ["en", "ja"] }),
        /offline_language_settings_readonly/,
    );
    assert.equal(state.writes.length, 1);
});
