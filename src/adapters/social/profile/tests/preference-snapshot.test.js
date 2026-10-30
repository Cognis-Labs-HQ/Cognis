import test from "node:test";
import assert from "node:assert/strict";
import { createOfflineClientFixture } from "../../../../tooling/reuse/offline-client-fixture.js";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { loadProfileOfflineClient } from "./reuse/offline-client.js";

const path = "/api/v1/social/users/learner/preferences/ui-preferences";

function fixture() {
    let server = { mode: "dark", studyPracticeMode: "draw" };
    let writeResponse = () => Response.json({ data: { saved: true } });
    let readResponse = () =>
        Response.json({ data: { layoutJson: JSON.stringify(server) } });
    const writes = [];
    const host = createOfflineClientFixture(async (_path, options = {}) => {
        if (options.method === "PUT") {
            server = JSON.parse(options.body).layout;
            writes.push(server);
            return writeResponse();
        }
        return readResponse();
    });
    const client = loadProfileOfflineClient(host);
    client.registerProfileOfflineClient(host.ctx);
    const globals = { ...host.globals, JSON };
    const prefs = loadTestModule(
        new URL("../../../../ui/reuse/ui-preferences.js", import.meta.url),
        {
            "./ui-ctx.js": { uiCtx: host.ctx },
            "./offline-state.js":
                host.imports["/static/reuse/offline-state.js"],
            "./offline-identity.js":
                host.imports["/static/reuse/offline-identity.js"],
            "./api-client.js": host.imports["/static/reuse/api-client.js"],
            "./message-style-options.js": {
                normalizeMessageStyle: (value) => value,
            },
            "./ui-language-state.js": loadTestModule(
                new URL(
                    "../../../../ui/reuse/ui-language-state.js",
                    import.meta.url,
                ),
                {},
                globals,
            ),
        },
        globals,
    );
    return {
        ...host,
        prefs,
        client,
        writes,
        delayWrite: (callback) => {
            writeResponse = callback;
        },
        delayRead: (callback) => {
            readResponse = callback;
        },
    };
}

for (const bufferOffline of [true, false]) {
    test(`acknowledged preferences survive later offline merges (bufferOffline=${bufferOffline})`, async () => {
        const state = fixture();
        try {
            await state.prefs.saveUiPreferences(
                { mode: "light" },
                { bufferOffline },
            );
            state.disconnect();
            await state.prefs.saveUiPreferences({
                studyPracticeMode: "reveal",
            });
            assert.deepEqual(await state.prefs.loadUiPreferences(), {
                mode: "light",
                studyPracticeMode: "reveal",
            });
            state.reconnect();
            assert.equal((await state.outbox.flush()).sent, 1);
            state.disconnect();
            assert.deepEqual(
                await state.prefs.loadUiPreferences(),
                state.writes.at(-1),
            );
            assert.deepEqual(state.writes.at(-1), {
                mode: "light",
                studyPracticeMode: "reveal",
            });
        } finally {
            state.controller.abort();
        }
    });
}

test("replayed preference snapshots preserve later pending changes", async () => {
    const state = fixture();
    try {
        await state.prefs.loadUiPreferences();
        state.disconnect();
        await state.prefs.saveUiPreferences({ mode: "light" });
        await state.prefs.saveUiPreferences({ studyPracticeMode: "reveal" });
        let started;
        let release;
        const began = new Promise((resolve) => {
            started = resolve;
        });
        const waiting = new Promise((resolve) => {
            release = resolve;
        });
        let index = 0;
        state.delayWrite(() => {
            if (++index === 1) {
                started();
                return waiting;
            }
            return Response.json({ data: { saved: true } });
        });
        state.reconnect();
        const flushing = state.outbox.flush();
        await began;
        state.disconnect();
        release(Response.json({ data: { saved: true } }));
        assert.equal((await flushing).sent, 1);
        assert.deepEqual(await state.prefs.loadUiPreferences(), {
            mode: "light",
            studyPracticeMode: "reveal",
        });
        state.reconnect();
        assert.equal((await state.outbox.flush()).sent, 1);
        state.disconnect();
        assert.deepEqual(await state.prefs.loadUiPreferences(), {
            mode: "light",
            studyPracticeMode: "reveal",
        });
    } finally {
        state.controller.abort();
    }
});

test("a stale preference read cannot replace an acknowledged snapshot", async () => {
    const state = fixture();
    try {
        let started;
        let release;
        const began = new Promise((resolve) => {
            started = resolve;
        });
        const waiting = new Promise((resolve) => {
            release = resolve;
        });
        state.delayRead(() => {
            started();
            return waiting;
        });
        const stale = state.client.profileFetch(path);
        await began;
        await state.client.profileFetch(path, {
            method: "PUT",
            body: JSON.stringify({ layout: { mode: "light" } }),
        });
        release(Response.json({ data: { layoutJson: '{"mode":"dark"}' } }));
        assert.equal(
            JSON.parse((await (await stale).json()).data.layoutJson).mode,
            "light",
        );
        state.disconnect();
        assert.deepEqual(await state.prefs.loadUiPreferences(), {
            mode: "light",
        });
    } finally {
        state.controller.abort();
    }
});

test("a delayed preference acknowledgement cannot cache across accounts", async () => {
    const state = fixture();
    try {
        state.delayWrite(() => {
            state.changeAccount("other");
            return Response.json({ data: { saved: true } });
        });
        await assert.rejects(
            state.client.profileFetch(path, {
                method: "PUT",
                body: JSON.stringify({ layout: { mode: "light" } }),
            }),
            /offline_account_changed/,
        );
        state.disconnect();
        await assert.rejects(
            state.client.profileFetch(path),
            /offline_read_unavailable/,
        );
    } finally {
        state.controller.abort();
    }
});

test("a rejected preference write preserves the last successful snapshot", async () => {
    const state = fixture();
    try {
        await state.prefs.loadUiPreferences();
        state.delayWrite(() =>
            Response.json({ error: { code: "forbidden" } }, { status: 403 }),
        );
        await assert.rejects(
            state.prefs.saveUiPreferences({ mode: "light" }),
            /ui_preferences_save_failed:403/,
        );
        state.disconnect();
        assert.deepEqual(await state.prefs.loadUiPreferences(), {
            mode: "dark",
            studyPracticeMode: "draw",
        });
    } finally {
        state.controller.abort();
    }
});
