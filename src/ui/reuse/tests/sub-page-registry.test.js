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
