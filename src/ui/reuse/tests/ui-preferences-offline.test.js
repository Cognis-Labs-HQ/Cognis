import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

function fixture() {
    const values = new Map([
        ["cognis_account", "learner"],
        ["cognis_access_token", "session"],
    ]);
    const writes = [];
    let duringRead = () => {};
    const globals = {
        localStorage: { getItem: (key) => values.get(key) ?? null },
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
            "./offline-state.js": { offlineEnabled: () => true },
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
