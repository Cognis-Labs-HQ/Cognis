import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createUiRoutes } from "../../routes/ui/index.js";
import { UIRegistry } from "../../reuse/ui-registry.js";
import { createResponseRecorder } from "./ui-routes-test-helpers.js";

test("GET /static/gateways/:id/:file serves file from registered static dir", async () => {
    const uiRegistry = new UIRegistry();
    const authUiDir = path.resolve(
        process.cwd(),
        "src",
        "gateways",
        "auth",
        "ui",
    );
    uiRegistry.registerStaticDir("auth", authUiDir);
    const route = createUiRoutes(undefined, uiRegistry);

    const recorder = createResponseRecorder();
    const handled = await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL(
            "http://localhost/static/gateways/auth/security-prefs/index.js",
        ),
    );

    assert.ok(handled);
    assert.equal(recorder.status, 200);
    assert.equal(
        recorder.headers["content-type"],
        "text/javascript; charset=utf-8",
    );
    assert.match(recorder.body, /createSettingsSection/);
});

test("GET /static/gateways/:id/:file returns 404 when static dir not registered", async () => {
    const uiRegistry = new UIRegistry();
    const route = createUiRoutes(undefined, uiRegistry);

    const recorder = createResponseRecorder();
    const handled = await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL(
            "http://localhost/static/gateways/auth/security-prefs/index.js",
        ),
    );

    assert.ok(handled);
    assert.equal(recorder.status, 404);
});

test("GET /static/gateways/notify/admin-section.js serves notify gateway admin UI", async () => {
    const uiRegistry = new UIRegistry();
    const notifyUiDir = path.resolve(
        process.cwd(),
        "src",
        "gateways",
        "notify",
        "ui",
    );
    uiRegistry.registerStaticDir("notify", notifyUiDir);
    const route = createUiRoutes(undefined, uiRegistry);

    const recorder = createResponseRecorder();
    const handled = await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL("http://localhost/static/gateways/notify/admin-section.js"),
    );

    assert.ok(handled);
    assert.equal(recorder.status, 200);
    assert.equal(
        recorder.headers["content-type"],
        "text/javascript; charset=utf-8",
    );
    assert.match(recorder.body, /createAdminSection/);
});

test("GET /static/adapters/social/profile/navbar.js serves profile adapter navbar plugin", async () => {
    const uiRegistry = new UIRegistry();
    const profileUiDir = path.resolve(
        process.cwd(),
        "src",
        "adapters",
        "social",
        "profile",
        "ui",
    );
    uiRegistry.registerAdapterStaticDir("social", "profile", profileUiDir);
    const route = createUiRoutes(undefined, uiRegistry);

    const recorder = createResponseRecorder();
    const handled = await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL("http://localhost/static/adapters/social/profile/navbar.js"),
    );

    assert.ok(handled);
    assert.equal(recorder.status, 200);
    assert.equal(
        recorder.headers["content-type"],
        "text/javascript; charset=utf-8",
    );
    assert.match(recorder.body, /registerAvatarProvider/);
});

test("GET /static/modules/study/languages/ja/components/hiragana-alphabet/ui/app.js serves module assets", async () => {
    const uiRegistry = new UIRegistry();
    const hiraganaUiDir = path.resolve(
        process.cwd(),
        "src",
        "modules",
        "study",
        "languages",
        "ja",
        "components",
        "hiragana-alphabet",
        "ui",
    );
    uiRegistry.registerModuleStaticDir(
        "study/languages/ja/components/hiragana-alphabet/ui",
        hiraganaUiDir,
    );
    const route = createUiRoutes(undefined, uiRegistry);

    const recorder = createResponseRecorder();
    const handled = await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL(
            "http://localhost/static/modules/study/languages/ja/components/hiragana-alphabet/ui/app.js",
        ),
    );

    assert.ok(handled);
    assert.equal(recorder.status, 200);
    assert.equal(
        recorder.headers["content-type"],
        "text/javascript; charset=utf-8",
    );
});

test("GET /static/modules/study/languages/reuse/study-sub-navigation.js serves shared Study language assets", async () => {
    const uiRegistry = new UIRegistry();
    const studyLanguageReuseDir = path.resolve(
        process.cwd(),
        "src",
        "modules",
        "study",
        "languages",
        "reuse",
    );
    uiRegistry.registerModuleStaticDir(
        "study/languages/reuse",
        studyLanguageReuseDir,
    );
    const route = createUiRoutes(undefined, uiRegistry);

    const recorder = createResponseRecorder();
    const handled = await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL(
            "http://localhost/static/modules/study/languages/reuse/study-sub-navigation.js",
        ),
    );

    assert.ok(handled);
    assert.equal(recorder.status, 200);
    assert.equal(
        recorder.headers["content-type"],
        "text/javascript; charset=utf-8",
    );
});

test("GET /static/modules/unknown/file.js returns 404 for unregistered module prefix", async () => {
    const uiRegistry = new UIRegistry();
    const route = createUiRoutes(undefined, uiRegistry);

    const recorder = createResponseRecorder();
    const handled = await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL("http://localhost/static/modules/unknown/file.js"),
    );

    assert.ok(handled);
    assert.equal(recorder.status, 404);
});
