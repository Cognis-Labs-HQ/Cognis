import test from "node:test";
import assert from "node:assert/strict";
import { createOfflineClientFixture } from "../../../tooling/reuse/offline-client-fixture.js";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

test("the host language catalog prepares after authentication and serves Settings without offline API requests", async (context) => {
    let requests = 0;
    const host = createOfflineClientFixture(async () => {
        requests++;
        return Response.json({
            data: [
                { iso_code: "en", name: "English" },
                { iso_code: "de", name: "Deutsch" },
            ],
        });
    });
    context.after(() => host.controller.abort());
    const client = loadTestModule(
        new URL("../ui-language-catalog.js", import.meta.url),
        {
            "./offline-identity.js":
                host.imports["/static/reuse/offline-identity.js"],
            "./ui-language-state.js": {
                enabledUiLanguages: () => ["en", "de"],
                selectUiLanguage: () =>
                    assert.fail("catalog loading must not change locale"),
            },
            "./i18n.js": {
                prepareUiLanguages: async (languages) =>
                    assert.deepEqual(Array.from(languages), ["en", "de"]),
            },
            "./ui-ctx.js": host.imports["/static/reuse/ui-ctx.js"],
            "./api-client.js": host.imports["/static/reuse/api-client.js"],
            "./offline-read-cache.js":
                host.imports["/static/reuse/offline-read-cache.js"],
            "./offline-snapshot.js":
                host.imports["/static/reuse/offline-snapshot.js"],
        },
        host.globals,
    );
    client.mountProvider(host.ctx);
    host.ctx.extendFlow(
        "authenticate-session",
        "resolve-session",
        { id: "test:catalogSession" },
        () => ({ authenticated: true }),
    );
    let prepared = false;
    host.ctx.extendFlow(
        "ui:languageCatalog:load",
        "after",
        { id: "test:catalogPrepared" },
        () => {
            prepared = true;
        },
    );
    await host.ctx.runFlow("authenticate-session", {});
    for (let i = 0; i < 50 && !prepared; i++)
        await new Promise((resolve) => setImmediate(resolve));
    assert.equal(prepared, true);
    assert.equal((await client.loadUiLanguageCatalog())[0].iso_code, "en");
    assert.equal((await client.loadUiLanguageCatalog())[1].iso_code, "de");
    assert.equal(requests, 1);
    host.disconnect();
    assert.equal((await client.loadUiLanguageCatalog())[1].iso_code, "de");
    assert.equal(requests, 1);
});
