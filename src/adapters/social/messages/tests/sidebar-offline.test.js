import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createOfflineClientFixture } from "../../../../tooling/reuse/offline-client-fixture.js";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { setOffline } from "../../../../ui/reuse/offline-state.js";
import { escapeHtml } from "../../../../ui/reuse/escape-html.js";
import { formatTemplate } from "../../../../ui/reuse/format-template.js";

test("Messages prepares its sidebar before first navigation and renders it from the offline asset cache", async (context) => {
    context.mock.timers.enable({ apis: ["setTimeout"] });
    const cache = new Map();
    let disconnected = false;
    const template = readFileSync(
        new URL("../ui/templates/sidebar.html", import.meta.url),
        "utf8",
    );
    const originalWindow = globalThis.window;
    const originalStorage = globalThis.localStorage;
    const storage = new Map([["cognis_offline_requirements", "[]"]]);
    globalThis.window = new EventTarget();
    globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null };
    setOffline(false);
    context.mock.method(globalThis, "fetch", async (path) => {
        if (!disconnected) {
            const body = path.endsWith("/sidebar.html") ? template : "[]";
            cache.set(path, body);
            return new Response(body);
        }
        const response = cache.get(path);
        if (!response) throw new TypeError("uncached_offline_asset");
        return new Response(response);
    });
    const fixture = createOfflineClientFixture(async () =>
        Response.json({ data: [] }),
    );
    context.after(() => {
        fixture.controller.abort();
        setOffline(false);
        globalThis.window = originalWindow;
        globalThis.localStorage = originalStorage;
    });
    const get = fixture.ctx.capabilities.get;
    const assets = get("offline:assets");
    let prepared;
    fixture.ctx.capabilities.get = (id) =>
        id === "offline:assets"
            ? {
                  register(paths, options) {
                      const retry = assets.register(paths, options);
                      prepared = assets.prepare(paths, options);
                      return retry;
                  },
              }
            : get(id);
    const client = loadTestModule(
        new URL("../ui/offline-client.js", import.meta.url),
        {
            ...fixture.imports,
            "./i18n.js": { createMessagesI18n: async () => ({}) },
            "./reuse/reaction-record.js": loadTestModule(
                new URL("../ui/reuse/reaction-record.js", import.meta.url),
                {},
                fixture.globals,
            ),
        },
        fixture.globals,
    );
    client.mountProvider(fixture.ctx);
    await prepared;
    assert.equal(
        cache.has("/static/adapters/social/messages/templates/sidebar.html"),
        true,
    );
    disconnected = true;
    fixture.disconnect();
    setOffline(true);
    const sidebar = loadTestModule(
        new URL("../ui/sidebar.js", import.meta.url),
        {
            "/static/reuse/escape-html.js": { escapeHtml },
            "/static/reuse/format-template.js": { formatTemplate },
            "./room-render.js": {
                renderRoomList: ({ rooms }) =>
                    rooms.map((room) => escapeHtml(room.name)).join(""),
            },
        },
        { fetch: globalThis.fetch },
    );
    const html = await sidebar.renderMessagesSidebar({
        signal: fixture.controller.signal,
        i18n: { t: (key) => key },
        rooms: [{ name: "Cached conversation" }],
    });
    assert.match(html, /Cached conversation/);
    assert.match(html, /id="messages-new-btn"/);
    assert.match(html, /class="messages-new-btn btn-confirm"/);
    fixture.controller.abort();
    await assert.rejects(
        assets.prepare(
            ["/static/adapters/social/messages/templates/sidebar.html"],
            { signal: fixture.controller.signal },
        ),
    );
});
