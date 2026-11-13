import test from "node:test";
import assert from "node:assert/strict";
import {
    deferred,
    loadSettingsMount,
} from "../fixtures/settings-startup/loader.js";

const tick = () => new Promise((resolve) => setImmediate(resolve));
const preferences = (languages) =>
    Response.json({
        data: {
            layoutJson: JSON.stringify({
                languagePriorityMode: "manual",
                languagePriority: languages,
            }),
        },
    });

test("settings overlaps independent reads and waits for saved locale before localization", async () => {
    const prefs = deferred();
    const acknowledgement = deferred();
    const setup = deferred();
    const sections = deferred();
    const localization = deferred();
    const started = [];
    const fixture = await loadSettingsMount({
        account: () => "account-a",
        apiFetch: (url) => {
            started.push(url);
            if (url.endsWith("/ui-preferences")) return prefs.promise;
            if (url.endsWith("/setup-status")) return setup.promise;
            if (url.endsWith("/settings-sections")) return sections.promise;
            assert.fail(`unexpected read ${url}`);
        },
        loadEditorAcknowledgement: () => {
            started.push("acknowledgement");
            return acknowledgement.promise;
        },
        createI18n: ({ preferredLanguages }) => {
            started.push("localization");
            assert.deepEqual(Array.from(preferredLanguages), ["de", "en"]);
            assert.equal(fixture.languageChanges[0].options.mode, "manual");
            return localization.promise;
        },
    });
    const mounted = fixture.mount({}).catch((error) => error);
    await tick();
    assert.deepEqual(started, [
        "/api/v1/social/users/account-a/preferences/ui-preferences",
        "acknowledgement",
        "/api/v1/auth/setup-status",
    ]);
    prefs.resolve(preferences(["de", "en"]));
    acknowledgement.resolve(true);
    setup.resolve(Response.json({ data: { requiresSetup: false } }));
    await tick();
    assert.deepEqual(started.slice(3), [
        "localization",
        "/api/v1/ui/settings-sections",
    ]);
    sections.resolve(Response.json({ data: [] }));
    localization.resolve({});
    assert.equal(await mounted, fixture.renderBoundary);
});

test("settings setup redirect completes before section discovery or localization", async () => {
    const reads = [];
    const fixture = await loadSettingsMount({
        account: () => "account-a",
        apiFetch: async (url) => {
            reads.push(url);
            if (url.endsWith("/ui-preferences")) return preferences(["en"]);
            if (url.endsWith("/setup-status"))
                return Response.json({ data: { requiresSetup: true } });
            assert.fail(`unexpected read before setup ${url}`);
        },
        loadEditorAcknowledgement: async () => false,
        createI18n: () =>
            assert.fail("setup redirect does not need localization"),
    });
    await fixture.mount({});
    assert.deepEqual(fixture.redirects, ["/settings#security"]);
    assert.equal(reads.length, 2);
});

test("each settings mount reads the current account and locale without reusing prior data", async () => {
    let account = "account-a";
    const locales = [];
    const reads = [];
    const fixture = await loadSettingsMount({
        account: () => account,
        apiFetch: async (url) => {
            reads.push(url);
            if (url.endsWith("/ui-preferences"))
                return preferences(
                    account === "account-a" ? ["de", "en"] : ["ja", "en"],
                );
            if (url.endsWith("/setup-status"))
                return Response.json({ data: { requiresSetup: false } });
            if (url.endsWith("/settings-sections"))
                return Response.json({ data: [] });
            assert.fail(`unexpected read ${url}`);
        },
        loadEditorAcknowledgement: async () => false,
        createI18n: async ({ preferredLanguages }) => {
            locales.push(Array.from(preferredLanguages));
            return {};
        },
    });
    for (account of ["account-a", "account-b"])
        assert.equal(
            await fixture.mount({}).catch((error) => error),
            fixture.renderBoundary,
        );
    assert.deepEqual(locales, [
        ["de", "en"],
        ["ja", "en"],
    ]);
    assert.equal(
        reads.filter((url) => url.endsWith("/settings-sections")).length,
        2,
    );
    assert.ok(
        reads.includes(
            "/api/v1/social/users/account-b/preferences/ui-preferences",
        ),
    );
});

test("cancelled settings startup cannot apply a late locale or setup redirect", async () => {
    const prefs = deferred();
    const controller = new AbortController();
    const fixture = await loadSettingsMount({
        account: () => "account-a",
        apiFetch: async (url) => {
            if (url.endsWith("/ui-preferences")) return prefs.promise;
            if (url.endsWith("/setup-status"))
                return Response.json({ data: { requiresSetup: true } });
            assert.fail(`unexpected cancelled read ${url}`);
        },
        loadEditorAcknowledgement: async () => false,
        createI18n: () => assert.fail("cancelled settings must not localize"),
    });
    const mounting = fixture.mount({}, { signal: controller.signal });
    controller.abort();
    prefs.resolve(preferences(["de"]));
    await mounting;
    assert.deepEqual(fixture.redirects, []);
    assert.deepEqual(fixture.languageChanges, []);
});

test("cancelled settings localization cannot change the destination title", async () => {
    const localization = deferred();
    const controller = new AbortController();
    const fixture = await loadSettingsMount({
        account: () => "account-a",
        apiFetch: async (url) => {
            if (url.endsWith("/ui-preferences")) return preferences(["en"]);
            if (url.endsWith("/setup-status"))
                return Response.json({ data: { requiresSetup: false } });
            if (url.endsWith("/settings-sections"))
                return Response.json({ data: [] });
            assert.fail(`unexpected read ${url}`);
        },
        loadEditorAcknowledgement: async () => true,
        createI18n: () => localization.promise,
    });
    const mounting = fixture.mount({}, { signal: controller.signal });
    await tick();
    controller.abort();
    localization.resolve({});
    await mounting;
});
