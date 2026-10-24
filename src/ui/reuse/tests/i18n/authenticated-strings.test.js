import test from "node:test";
import assert from "node:assert/strict";
import { installI18nEnvironment } from "../fixtures/i18n-environment.js";

test("component strings use authenticated API requests for protected catalogs", async () => {
    let authorization = null;
    const { storage } = installI18nEnvironment(async (_path, options) => {
        authorization = options.headers.get("authorization");
        return new Response(
            '<resources><string name="module.example.name">Example</string></resources>',
            { status: 200 },
        );
    });
    storage.set("cognis_access_token", "catalog-token");
    const { extendI18n } = await import("../../i18n.js");
    const i18n = await extendI18n(
        { locale: "en", t: (key) => key },
        "https://cognis.test/api/v1/modules/catalog/strings/f055f2e5-227a-5fb4-b934-5397ec32cf2d",
    );
    assert.equal(i18n.t("module.example.name"), "Example");
    assert.equal(authorization, "Bearer catalog-token");
});
