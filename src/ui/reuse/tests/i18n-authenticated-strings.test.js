import test from "node:test";
import assert from "node:assert/strict";

test("component strings use authenticated API requests for protected catalogs", async () => {
    let authorization = null;
    globalThis.localStorage = {
        getItem(key) {
            return key === "cognis_access_token" ? "catalog-token" : null;
        },
    };
    globalThis.window = {
        location: { origin: "https://cognis.test" },
        dispatchEvent() {},
    };
    globalThis.fetch = async (_path, options) => {
        authorization = options.headers.get("authorization");
        return new Response(
            '<resources><string name="module.example.name">Example</string></resources>',
            { status: 200 },
        );
    };
    const { extendI18n } = await import("../i18n.js");
    await extendI18n(
        { locale: "en", t: (key) => key },
        "https://cognis.test/api/v1/modules/catalog/strings/f055f2e5-227a-5fb4-b934-5397ec32cf2d",
    );
    assert.equal(authorization, "Bearer catalog-token");
});
