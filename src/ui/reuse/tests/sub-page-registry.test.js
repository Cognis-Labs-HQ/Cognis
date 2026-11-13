import assert from "node:assert/strict";
import test from "node:test";
import { createSubPageRegistry } from "../sub-page-registry.js";

test("sub-page providers expose grouped menus and resolve page routes", async () => {
    const registry = createSubPageRegistry();
    assert.equal(
        registry.register("languages", {
            listGroups: async () => [
                { id: "ja", label: "Japanese" },
                { id: "en", label: "English" },
            ],
            listPages: async (languageCode) => [
                {
                    id: `${languageCode}-library`,
                    label: "Library",
                    pageUrl: `/study/${languageCode}/library`,
                },
            ],
        }),
        true,
    );

    const model = await registry.load("languages", {
        selectedGroupId: "ja",
    });
    assert.deepEqual(
        model.groups.map((group) => group.id),
        ["ja", "en"],
    );
    assert.equal(model.pages[0].pageUrl, "/study/ja/library");
    assert.deepEqual(await registry.resolve("languages", "/study/en/library"), {
        groupId: "en",
        page: {
            id: "en-library",
            label: "Library",
            pageUrl: "/study/en/library",
        },
    });
});

test("sub-page invalidation reloads provider data", async () => {
    const registry = createSubPageRegistry();
    let loadCount = 0;
    registry.register("pages", {
        listGroups: async () => [{ id: "group" }],
        listPages: async () => [{ id: String(++loadCount), pageUrl: "/page" }],
    });

    await registry.load("pages");
    await registry.load("pages");
    assert.equal(loadCount, 1);
    registry.invalidate("pages");
    await registry.load("pages");
    assert.equal(loadCount, 2);
});

for (const stage of ["groups", "pages"]) {
    test(`failed ${stage} discovery can retry without remounting its provider`, async () => {
        const registry = createSubPageRegistry();
        let unavailable = true;
        registry.register("study", {
            listGroups: async () => {
                if (stage === "groups" && unavailable)
                    throw new Error("temporary_failure");
                return [{ id: "ja" }];
            },
            listPages: async () => {
                if (stage === "pages" && unavailable)
                    throw new Error("temporary_failure");
                return [{ id: "explore", pageUrl: "/study/explore" }];
            },
        });
        await assert.rejects(registry.load("study"), /temporary_failure/);
        unavailable = false;
        assert.equal((await registry.load("study")).pages[0].id, "explore");
    });
}
