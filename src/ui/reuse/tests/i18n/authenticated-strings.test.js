import test from "node:test";
import assert from "node:assert/strict";
import { installI18nEnvironment } from "../fixtures/i18n-environment.js";

test("component strings use authenticated API requests for protected catalogs", async () => {
    const authorizations = [];
    const { storage } = installI18nEnvironment(async (_path, options) => {
        authorizations.push(options.headers.get("authorization"));
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
    storage.set("cognis_access_token", "another-user-token");
    await extendI18n(
        { locale: "en", t: (key) => key },
        "https://cognis.test/api/v1/modules/catalog/strings/f055f2e5-227a-5fb4-b934-5397ec32cf2d",
    );
    assert.deepEqual(authorizations, [
        "Bearer catalog-token",
        "Bearer another-user-token",
    ]);
});

async function versionedHost(respond) {
    const environment = installI18nEnvironment(respond);
    environment.storage.set("cognis_account", "administrator");
    environment.storage.set("cognis_access_token", "first-session");
    const { extendI18n } = await import(
        `../../i18n.js?fixture=${crypto.randomUUID()}`
    );
    return {
        ...environment,
        load: (revision = "first") =>
            extendI18n(
                {
                    locale: "en",
                    t(key) {
                        throw Object.assign(
                            new Error(`missing_translation:${key}`),
                            { code: "missing_translation" },
                        );
                    },
                },
                "/api/v1/modules/catalog/strings/example",
                { revision },
            ),
    };
}

const xmlResponse = (name) =>
    new Response(
        `<resources><string name="module.example.name">${name}</string></resources>`,
    );

test("unchanged catalog translations are reused; a changed content revision fetches fresh strings", async () => {
    let name = "Original";
    const host = await versionedHost(async () => xmlResponse(name));
    const resolvers = await Promise.all(
        Array.from({ length: 20 }, () => host.load()),
    );
    assert.ok(
        resolvers.every(
            (resolver) => resolver.t("module.example.name") === "Original",
        ),
    );
    assert.equal(host.requests.length, 1);
    for (let refresh = 0; refresh < 10; refresh++) await host.load();
    assert.equal(host.requests.length, 1);
    name = "Updated";
    assert.equal(
        (await host.load("second")).t("module.example.name"),
        "Updated",
    );
    assert.equal(host.requests.length, 2);
    assert.equal(host.requests[1].options.cache, "reload");
});

test("versioned private translations cannot be reused by a changed account or session", async () => {
    const host = await versionedHost(async (_path, options) =>
        xmlResponse(options.headers.get("authorization")),
    );
    assert.equal(
        (await host.load()).t("module.example.name"),
        "Bearer first-session",
    );
    host.storage.set("cognis_access_token", "second-session");
    assert.equal(
        (await host.load()).t("module.example.name"),
        "Bearer second-session",
    );
    host.storage.set("cognis_account", "another-administrator");
    await host.load();
    assert.equal(host.requests.length, 3);
});

test("failed translation loads are evicted so the same revision can be retried", async () => {
    let available = false;
    const host = await versionedHost(async () =>
        available
            ? xmlResponse("Recovered")
            : new Response(null, { status: 404 }),
    );
    const missing = await host.load();
    assert.throws(() => missing.t("module.example.name"), {
        code: "missing_translation",
    });
    available = true;
    assert.equal((await host.load()).t("module.example.name"), "Recovered");
    assert.equal(host.requests.length, 2);
});

test("a late response from an earlier session cannot overwrite current private translations", async () => {
    let finish;
    const pending = new Promise((resolve) => {
        finish = resolve;
    });
    const host = await versionedHost(async (_path, options) =>
        options.headers.get("authorization") === "Bearer first-session"
            ? pending
            : xmlResponse("Current Session"),
    );
    const earlier = host.load();
    await new Promise(setImmediate);
    host.storage.set("cognis_access_token", "current-session");
    assert.equal(
        (await host.load()).t("module.example.name"),
        "Current Session",
    );
    finish(xmlResponse("Earlier Session"));
    const stale = await earlier;
    assert.throws(() => stale.t("module.example.name"), {
        code: "missing_translation",
    });
    assert.equal(
        (await host.load()).t("module.example.name"),
        "Current Session",
    );
    assert.equal(host.requests.length, 2);
});
