import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { createOfflineClientFixture } from "../../../tooling/reuse/offline-client-fixture.js";

function loadClient(host) {
    const offline = loadTestModule(
        new URL("../ui/offline-content.js", import.meta.url),
        {
            "/static/reuse/offline-state.js":
                host.imports["/static/reuse/offline-state.js"],
            "/static/reuse/ui-ctx.js": { uiCtx: host.ctx },
            "/static/reuse/popup.js": {
                openPopup: () =>
                    assert.fail("navigation reads must not open popups"),
            },
            "/static/reuse/escape-html.js": { escapeHtml: String },
        },
        host.globals,
    );
    return loadTestModule(
        new URL("../ui/navigation-client.js", import.meta.url),
        { ...host.imports, "./offline-content.js": offline },
        host.globals,
    );
}

function fixture() {
    const requests = [];
    const host = createOfflineClientFixture(async (path) => {
        requests.push(path);
        const data = path.endsWith("/registered-languages")
            ? [{ code: "ja", name: "Japanese" }]
            : path.endsWith("/preferences")
              ? { learningLanguages: ["ja"] }
              : [{ id: "kana", pageUrl: "/study/explore/ja/kana" }];
        return Response.json({ data });
    });
    const client = loadClient(host);
    client.registerStudyNavigation(host.ctx);
    return { host, client, requests };
}

test("Study hub metadata and module links reopen offline through their registered owner flows", async () => {
    const { host, client, requests } = fixture();
    let reads = 0;
    host.ctx.extendFlow(
        "study:navigation:preferences",
        "before",
        { id: "test:observeStudyRead" },
        () => {
            reads++;
        },
    );
    const languages = await client.fetchStudyLanguages();
    const preferences = await client.fetchStudyPreferences();
    const modules = await client.fetchStudyModules("ja");
    assert.equal(requests.length, 3);
    host.disconnect();
    assert.equal(
        JSON.stringify(await client.fetchStudyLanguages()),
        JSON.stringify(languages),
    );
    assert.equal(
        JSON.stringify(await client.fetchStudyPreferences()),
        JSON.stringify(preferences),
    );
    assert.equal(
        JSON.stringify(await client.fetchStudyModules("ja")),
        JSON.stringify(modules),
    );
    assert.equal(reads, 2);
    assert.equal(requests.length, 3);
    host.changeAccount("another-learner");
    assert.equal(
        (await client.fetchStudyPreferences()).learningLanguages.length,
        0,
    );
    host.controller.abort();
    await assert.rejects(client.fetchStudyLanguages(), { name: "AbortError" });
});

test("Study prepares an unvisited hub after authentication and refreshes invalidated snapshots", async () => {
    const window = new EventTarget();
    const requests = [];
    const host = createOfflineClientFixture(
        async (path) => {
            requests.push(path);
            return Response.json({
                data: path.endsWith("/preferences")
                    ? { learningLanguages: ["ja"] }
                    : path.endsWith("/modules")
                      ? [{ id: "kana" }]
                      : [{ code: "ja" }],
            });
        },
        { window },
    );
    const client = loadClient(host);
    client.registerStudyNavigation(host.ctx);
    host.ctx.extendFlow(
        "authenticate-session",
        "resolve-session",
        { id: "test:studySession" },
        () => ({ authenticated: true }),
    );
    await host.ctx.runFlow("authenticate-session", {});
    const waitForPreparation = async (count) => {
        for (let pass = 0; pass < 20 && requests.length < count; pass++)
            await new Promise((resolve) => setImmediate(resolve));
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(requests.length, count);
    };
    await waitForPreparation(3);
    host.invalidateCache();
    window.dispatchEvent(new Event("cognis:offline-preference-changed"));
    await waitForPreparation(6);
    host.disconnect();
    assert.equal((await client.fetchStudyLanguages())[0].code, "ja");
    assert.equal(
        (await client.fetchStudyPreferences()).learningLanguages[0],
        "ja",
    );
    assert.equal((await client.fetchStudyModules("ja"))[0].id, "kana");
    assert.equal(requests.length, 6);
    host.controller.abort();
});

test("Study serves prepared online navigation immediately and invalidates it on enrollment changes", async (context) => {
    const window = new EventTarget();
    let requests = 0;
    const host = createOfflineClientFixture(
        async (_path, options) => {
            assert.equal(options.timeoutMs, 5000);
            return Response.json({ data: { revision: ++requests } });
        },
        { window },
    );
    context.after(() => host.controller.abort());
    const client = loadClient(host);
    client.registerStudyNavigation(host.ctx);
    assert.equal((await client.fetchStudyPreferences()).revision, 1);
    assert.equal((await client.fetchStudyPreferences()).revision, 1);
    assert.equal(requests, 1);
    window.dispatchEvent(new Event("cognis:study-enrollment-changed"));
    assert.equal((await client.fetchStudyPreferences()).revision, 2);
    window.dispatchEvent(new Event("cognis:module-lifecycle-changed"));
    assert.equal((await client.fetchStudyPreferences()).revision, 3);
});
