import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { createOfflineClientFixture } from "../../../tooling/reuse/offline-client-fixture.js";

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
    const client = loadTestModule(
        new URL("../ui/navigation-client.js", import.meta.url),
        host.imports,
        host.globals,
    );
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
    await assert.rejects(
        client.fetchStudyPreferences(),
        /offline_read_unavailable/,
    );
    host.controller.abort();
    await assert.rejects(client.fetchStudyLanguages(), { name: "AbortError" });
});
