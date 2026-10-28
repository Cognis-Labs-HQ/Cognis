import test from "node:test";
import assert from "node:assert/strict";
import { createOfflineClientFixture } from "../../../tooling/reuse/offline-client-fixture.js";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

test("verified enrollment prepares opted-in collections without visiting Explore and browsing does not protect activity on close", async (context) => {
    const requested = [];
    const window = new EventTarget();
    let enrolled = ["ja"];
    let dictionaryError;
    const host = createOfflineClientFixture(
        async (path, options) => {
            requested.push(path);
            if (path.includes("/dictionary/providers")) {
                assert.equal(options.timeoutMs, 3000);
                if (dictionaryError) throw dictionaryError;
            }
            let data = [];
            if (path.includes("/schemas"))
                data = [
                    {
                        id: "light",
                        metadata: { offline: { cache: "lightweight" } },
                    },
                    { id: "heavy", metadata: {} },
                ];
            else if (path.endsWith("/locations"))
                data = { readable: [{ scope: "global" }] };
            else if (path.includes("/entries?"))
                data = [{ id: "character", schemaId: "light", label: "学" }];
            return Response.json({ data });
        },
        { window },
    );
    context.after(() => host.controller.abort());
    const snapshots = loadTestModule(
        new URL("../ui/reuse/library-offline-snapshot.js", import.meta.url),
        {
            ...host.imports,
            "../navigation-client.js": {
                fetchStudyPreferences: async () => ({
                    learningLanguages: enrolled,
                }),
            },
        },
        host.globals,
    );
    const library = loadTestModule(
        new URL("../ui/library-client.js", import.meta.url),
        {
            ...host.imports,
            "./reuse/library-offline-snapshot.js": snapshots,
            "./offline-content.js": { readStudySnapshot: (load) => load() },
        },
        { ...host.globals, URLSearchParams },
    );
    library.registerLibraryClient(host.ctx);
    let prepared = false;
    host.ctx.extendFlow(
        "study:library:fetchLibraryEntries",
        "after",
        { id: "test:prepared" },
        () => {
            prepared = true;
        },
    );
    assert.equal(requested.length, 0);
    host.ctx.extendFlow(
        "authenticate-session",
        "resolve-session",
        { id: "test:enrolled" },
        () => ({ authenticated: true }),
    );
    await host.ctx.runFlow("authenticate-session", {});
    for (let i = 0; i < 50 && !prepared; i++)
        await new Promise((resolve) => setImmediate(resolve));
    assert.equal(prepared, true);
    assert.ok(requested.some((path) => path.endsWith("schemas?language=ja")));
    assert.equal(
        requested.some((path) => path.includes("schemaId=heavy")),
        false,
    );
    dictionaryError = new DOMException("timed out", "TimeoutError");
    assert.equal(
        (await library.fetchSearchableDictionaryProviders("ja")).length,
        0,
    );
    dictionaryError = Object.assign(new Error("denied"), { status: 403 });
    await assert.rejects(library.fetchSearchableDictionaryProviders("ja"), {
        status: 403,
    });
    dictionaryError = null;
    host.disconnect();
    assert.equal((await library.fetchLibrarySchemas())[0].id, "light");
    assert.equal(
        (
            await library.fetchLibraryEntries({
                scope: "global",
                schemaId: "light",
            })
        )[0].label,
        "学",
    );
    await library.markLibraryEntriesViewed(["character"]);
    assert.equal((await host.outbox.pending("study.viewed")).length, 1);
    assert.equal(host.outbox.hasBufferedChanges(), false);
    host.reconnect();
    enrolled = ["en"];
    window.dispatchEvent(new Event("cognis:study-enrollment-changed"));
    for (
        let i = 0;
        i < 50 &&
        !requested.some((path) => path.endsWith("schemas?language=en"));
        i++
    )
        await new Promise((resolve) => setImmediate(resolve));
    assert.ok(requested.some((path) => path.endsWith("schemas?language=en")));
    host.changeAccount("other");
    host.disconnect();
    await assert.rejects(
        library.fetchLibraryEntries({ scope: "global", schemaId: "light" }),
        /offline_read_unavailable/,
    );
});
