import assert from "node:assert/strict";
import test from "node:test";
import { registerUi } from "../api/index.js";

function captureUiRegistration() {
    const spaRoutes = [];
    const staticDirs = [];
    const pageExtensions = [];
    const navbarPlugins = [];
    const adminSections = [];
    registerUi({
        moduleRoot: "/tmp/nextcloud-whiteboard",
        registerStaticDir(prefix, dir) {
            staticDirs.push({ prefix, dir });
        },
        registerNavbarPlugin(plugin) {
            navbarPlugins.push(plugin);
        },
        registerSpaRoute(route) {
            spaRoutes.push(route);
        },
        registerPageExtension(pageId, element) {
            pageExtensions.push({ pageId, element });
        },
        registerAdminSection(section) {
            adminSections.push(section);
        },
    });
    return {
        spaRoutes,
        staticDirs,
        pageExtensions,
        navbarPlugins,
        adminSections,
    };
}

test("nextcloud whiteboard registers full SPA routing and boilerplate styles", () => {
    const { spaRoutes } = captureUiRegistration();
    const routesByBase = new Map(spaRoutes.map((route) => [route.base, route]));

    for (const base of ["/whiteboards", "/whiteboard"]) {
        const route = routesByBase.get(base);
        assert.ok(route, `${base} should be registered as a SPA route`);
        assert.equal(
            route.scriptUrl,
            "/static/modules/nextcloud-whiteboard/app/index.js",
        );
        assert.deepEqual(route.stylesheets, [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/modules/nextcloud-whiteboard/styles/whiteboards.css",
        ]);
    }
});

test("nextcloud whiteboard app loads module strings and omits inline status element", async () => {
    const source = await import("node:fs/promises").then((fs) =>
        fs.readFile(new URL("../ui/app/index.js", import.meta.url), "utf8"),
    );
    assert.match(
        source,
        /componentStringBaseUrls:\s*\[\s*"\/static\/modules\/nextcloud-whiteboard\/languages"/,
    );
    assert.doesNotMatch(source, /wb-connection-status/);
    assert.match(
        source,
        /\/static\/modules\/nextcloud-whiteboard\/share-adapter\.js/,
    );
    assert.match(
        source,
        /\/static\/gateways\/share\/ui\/reuse\/share-button\.js/,
    );
    assert.match(source, /showNavbar:\s*sharePageFlag\("showNavbar",\s*true\)/);
    assert.doesNotMatch(source, /import\("\.\/share-adapter\.js"\)/);
});

test("nextcloud whiteboard canvas deletes selected objects via keyboard", async () => {
    const source = await import("node:fs/promises").then((fs) =>
        fs.readFile(
            new URL("../ui/whiteboard/canvas.js", import.meta.url),
            "utf8",
        ),
    );
    assert.match(source, /function deleteSelectedElements\(\)/);
    assert.match(
        source,
        /event\.key !== "Delete" && event\.key !== "Backspace"/,
    );
    assert.match(
        source,
        /canvasElement\.addEventListener\("keydown", onKeyDown\)/,
    );
    assert.match(
        source,
        /canvasElement\.removeEventListener\("keydown", onKeyDown\)/,
    );
});
