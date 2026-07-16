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
    const { spaRoutes, pageExtensions } = captureUiRegistration();
    const routesByBase = new Map(spaRoutes.map((route) => [route.base, route]));

    assert.deepEqual(pageExtensions, []);

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
    assert.doesNotMatch(source, /whiteboard-connection-status/);
    assert.match(
        source,
        /\/static\/modules\/nextcloud-whiteboard\/share-adapter\.js/,
    );
    assert.match(
        source,
        /\/static\/gateways\/share\/ui\/reuse\/share-button\.js/,
    );
    assert.match(source, /showNavbar:\s*sharePageFlag\("showNavbar",\s*true\)/);
    assert.match(source, /pageManifest:\s*\{/);
    assert.match(source, /pointerTracking:\s*true/);
    assert.match(
        source,
        /const canvasElement = document\.getElementById\("whiteboard-canvas"\);/,
    );
    assert.match(source, /canvasElement\.closest\("\.main-window"\)/);
    assert.match(source, /function getPointerOffset\(\)/);
    assert.match(source, /getPointerOffset,/);
    assert.match(source, /id="page-presence-section"/);
    assert.match(source, /class="whiteboard-toolbar-group" aria-live="polite"/);
    assert.match(source, /function throttleLatest\(callback, delay\)/);
    assert.match(source, /function updateHistoryControls\(\)/);
    assert.match(
        source,
        /canvas\.onHistoryChange\?\.\(updateHistoryControls\)/,
    );
    assert.match(source, /redoButton\?\.addEventListener\("click"/);
    assert.match(
        source,
        /if \(meta\?\.transient !== true\) persistChanges\(elements\)/,
    );
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
    assert.match(source, /function notifyTransientChange\(\)/);
    assert.match(source, /transient:\s*true/);
    assert.doesNotMatch(source, /canvasElement\.width \|\| 0/);
    assert.match(source, /viewportOffsetX/);
    assert.match(source, /getViewportOffset\(\)/);
    assert.match(source, /function notifyHistoryChange\(\)/);
    assert.match(source, /canRedo\(\)/);
    assert.doesNotMatch(source, /parent\.scrollLeft =/);
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

test("nextcloud whiteboard image paste saves and selects resizable image objects", async () => {
    const [canvasSource, elementsSource] = await Promise.all([
        import("node:fs/promises").then((fs) =>
            fs.readFile(
                new URL("../ui/whiteboard/canvas.js", import.meta.url),
                "utf8",
            ),
        ),
        import("node:fs/promises").then((fs) =>
            fs.readFile(
                new URL("../ui/whiteboard/elements.js", import.meta.url),
                "utf8",
            ),
        ),
    ]);
    assert.match(
        canvasSource,
        /function createImageElementFromDataUrl\(dataUrl\)/,
    );
    assert.match(canvasSource, /commitCreatedElement\(\s*buildImageElement/);
    assert.match(
        canvasSource,
        /document\.addEventListener\("paste", onPaste\)/,
    );
    assert.match(canvasSource, /if \(event\.defaultPrevented\) return/);
    assert.match(canvasSource, /findClipboardImageFile\(event\)/);
    assert.doesNotMatch(
        canvasSource,
        /commitElements\(\[\s*\.\.\.elements,\s*buildImageElement/,
    );
    assert.match(elementsSource, /const imageElementCache = new Map\(\)/);
    assert.match(elementsSource, /whiteboard:image-loaded/);
    assert.match(
        canvasSource,
        /addEventListener\("whiteboard:image-loaded", scheduleRender\)/,
    );
    assert.match(
        elementsSource,
        /export function buildImageElement\(point, dataUrl, dimensions = \{\}\)/,
    );
});

test("nextcloud whiteboard defaults to select after canvas refresh", async () => {
    const [canvasSource, appSource] = await Promise.all([
        import("node:fs/promises").then((fs) =>
            fs.readFile(
                new URL("../ui/whiteboard/canvas.js", import.meta.url),
                "utf8",
            ),
        ),
        import("node:fs/promises").then((fs) =>
            fs.readFile(new URL("../ui/app/index.js", import.meta.url), "utf8"),
        ),
    ]);
    assert.match(canvasSource, /let activeTool = "select"/);
    assert.match(appSource, /let activeTool = "select"/);
    assert.match(
        appSource,
        /data-tool="select" class="whiteboard-tool active"/,
    );
    assert.match(appSource, /data-tool="pen" class="whiteboard-tool"/);
    assert.match(
        appSource,
        /const SYNC_MESSAGE_BOARD_RENAMED = "BOARD_RENAMED"/,
    );
    assert.match(appSource, /function canRenameActiveBoard\(\)/);
    assert.match(appSource, /function emitBoardRenamed\(title\)/);
    assert.match(appSource, /function syncBoardUrl\(boardId\)/);
    assert.match(
        appSource,
        /window\.history\.replaceState\(null, "", nextUrl\)/,
    );
});
