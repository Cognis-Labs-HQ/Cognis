import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createUiRoutes } from "../../routes/ui/index.js";
import { UIRegistry } from "../../reuse/ui-registry.js";
import { createResponseRecorder } from "./ui-routes-test-helpers.js";

test("GET /static/reuse/ rejects directories before committing a response", async () => {
    const route = createUiRoutes();
    const recorder = createResponseRecorder();

    const handled = await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL("http://localhost/static/reuse/"),
    );

    assert.ok(handled);
    assert.equal(recorder.status, 404);
    assert.equal(recorder.writeHeadCalls, 1);
    assert.equal(recorder.headers["cache-control"], "no-store");
    assert.equal(recorder.headers["x-content-type-options"], "nosniff");
    assert.deepEqual(JSON.parse(recorder.body), {
        error: { code: "not_found", message: "Asset not found." },
    });
});

test("versioned text assets negotiate Brotli with MIME and immutable caching", async () => {
    const sourcePath = path.resolve("src/ui/reuse/api-client.js");
    const compressedPath = `${sourcePath}.br`;
    await writeFile(
        compressedPath,
        brotliCompressSync(await readFile(sourcePath)),
    );
    try {
        const route = createUiRoutes();
        const recorder = createResponseRecorder();
        await route(
            { headers: { "accept-encoding": "br, gzip" } } as any,
            recorder.res as any,
            new URL(
                "http://localhost/static/reuse/api-client.js?v=development",
            ),
        );

        assert.equal(recorder.status, 200);
        assert.equal(recorder.headers["content-encoding"], "br");
        assert.equal(recorder.headers.vary, "Accept-Encoding");
        assert.equal(
            recorder.headers["content-type"],
            "text/javascript; charset=utf-8",
        );
        assert.equal(
            recorder.headers["cache-control"],
            "public, max-age=31536000, immutable",
        );
    } finally {
        await rm(compressedPath, { force: true });
    }
});

test("precompressed assets exclude encodings with a zero quality value", async () => {
    const sourcePath = path.resolve("src/ui/reuse/api-client.js");
    const brotliPath = `${sourcePath}.br`;
    const gzipPath = `${sourcePath}.gz`;
    const source = await readFile(sourcePath);
    await Promise.all([
        writeFile(brotliPath, brotliCompressSync(source)),
        writeFile(gzipPath, gzipSync(source)),
    ]);
    try {
        const route = createUiRoutes();
        const recorder = createResponseRecorder();
        await route(
            { headers: { "accept-encoding": "br;q=0, gzip;q=0.5" } } as any,
            recorder.res as any,
            new URL(
                "http://localhost/static/reuse/api-client.js?v=development",
            ),
        );

        assert.equal(recorder.status, 200);
        assert.equal(recorder.headers["content-encoding"], "gzip");
    } finally {
        await Promise.all([
            rm(brotliPath, { force: true }),
            rm(gzipPath, { force: true }),
        ]);
    }
});

test("source assets use identity encoding when precompressed files are absent", async () => {
    const route = createUiRoutes();
    const recorder = createResponseRecorder();
    await route(
        { headers: { "accept-encoding": "br, gzip" } } as any,
        recorder.res as any,
        new URL("http://localhost/static/reuse/escape-html.js"),
    );

    assert.equal(recorder.status, 200);
    assert.equal(recorder.headers["content-encoding"], undefined);
    assert.equal(
        recorder.headers["content-type"],
        "text/javascript; charset=utf-8",
    );
});

test("source assets reject requests that exclude every available encoding", async () => {
    const route = createUiRoutes();
    const recorder = createResponseRecorder();
    await route(
        {
            headers: {
                "accept-encoding": "identity;q=0, br;q=0, gzip;q=0",
            },
        } as any,
        recorder.res as any,
        new URL("http://localhost/static/reuse/escape-html.js"),
    );

    assert.equal(recorder.status, 406);
    assert.equal(recorder.headers.vary, "Accept-Encoding");
    assert.deepEqual(JSON.parse(recorder.body), {
        error: {
            code: "not_acceptable",
            message: "No acceptable asset encoding is available.",
        },
    });
});

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
    assert.match(recorder.body, /ui:navbarAvatarProvider/);
});

test("GET /static/adapters/share/:method/page.js serves Share adapter pages", async () => {
    const uiRegistry = new UIRegistry();
    for (const adapterId of ["link", "user"]) {
        uiRegistry.registerAdapterStaticDir(
            "share",
            adapterId,
            path.resolve(process.cwd(), "src", "adapters", "share", adapterId),
        );
    }
    const route = createUiRoutes(undefined, uiRegistry);

    for (const adapterId of ["link", "user"]) {
        const recorder = createResponseRecorder();
        const handled = await route(
            { headers: {} } as any,
            recorder.res as any,
            new URL(
                `http://localhost/static/adapters/share/${adapterId}/page.js`,
            ),
        );

        assert.ok(handled);
        assert.equal(recorder.status, 200);
        assert.equal(
            recorder.headers["content-type"],
            "text/javascript; charset=utf-8",
        );
        assert.match(recorder.body, /renderPage/);
    }
});

test("GET /static/adapters/share/link/ui/share-links-popup/index.js serves Link Share adapter popup module", async () => {
    const uiRegistry = new UIRegistry();
    const linkAdapterRoot = path.resolve(
        process.cwd(),
        "src",
        "adapters",
        "share",
        "link",
    );
    uiRegistry.registerAdapterStaticDir("share", "link", linkAdapterRoot);
    const route = createUiRoutes(undefined, uiRegistry);

    const recorder = createResponseRecorder();
    const handled = await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL(
            "http://localhost/static/adapters/share/link/ui/share-links-popup/index.js",
        ),
    );

    assert.ok(handled);
    assert.equal(recorder.status, 200);
    assert.equal(
        recorder.headers["content-type"],
        "text/javascript; charset=utf-8",
    );
    assert.match(recorder.body, /openShareLinksPopup/);
});

test("GET /static/adapters/share/link/ui/share-links-popup/index.css serves Link Share adapter popup styles", async () => {
    const uiRegistry = new UIRegistry();
    const linkAdapterRoot = path.resolve(
        process.cwd(),
        "src",
        "adapters",
        "share",
        "link",
    );
    uiRegistry.registerAdapterStaticDir("share", "link", linkAdapterRoot);
    const route = createUiRoutes(undefined, uiRegistry);

    const recorder = createResponseRecorder();
    const handled = await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL(
            "http://localhost/static/adapters/share/link/ui/share-links-popup/index.css",
        ),
    );

    assert.ok(handled);
    assert.equal(recorder.status, 200);
    assert.equal(recorder.headers["content-type"], "text/css; charset=utf-8");
    assert.match(recorder.body, /share-links-popup/);
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

test("installed module string bundles are served before module bootstrap", async () => {
    const uuid = "f055f2e5-227a-5fb4-b934-5397ec32cf2d";
    const moduleRoot = path.resolve("external-modules", uuid);
    const stringsPath = path.join(moduleRoot, "ui/languages/en/strings.xml");
    await mkdir(path.dirname(stringsPath), { recursive: true });
    await writeFile(
        stringsPath,
        '<resources><string name="module.title">Meetings</string></resources>',
    );
    const route = createUiRoutes({
        listManifests: async () => [
            {
                id: "meetings",
                uuid,
                entrypoints: { ui: "./ui/app.js" },
                ui: {
                    stringsBaseUrl: "/static/modules/meetings/languages",
                },
            },
        ],
    } as any);
    const recorder = createResponseRecorder();

    try {
        assert.equal(
            await route(
                { headers: {} } as any,
                recorder.res as any,
                new URL(
                    "http://localhost/static/modules/meetings/languages/en/strings.xml",
                ),
            ),
            true,
        );
        assert.equal(recorder.status, 200);
        assert.match(recorder.body, /module\.title/);
    } finally {
        await rm(moduleRoot, { recursive: true, force: true });
    }
});
