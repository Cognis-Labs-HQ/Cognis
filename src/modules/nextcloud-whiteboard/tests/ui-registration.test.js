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
            "/static/styles/reuse/layout.css",
            "/static/styles/reuse/page-sections.css",
            "/static/modules/nextcloud-whiteboard/styles/whiteboards.css",
        ]);
    }
});

test("nextcloud whiteboard standalone shell loads shared layout styles", async () => {
    const shellSource = await import("node:fs/promises").then((fs) =>
        fs.readFile(new URL("../ui/index.html", import.meta.url), "utf8"),
    );
    assert.match(shellSource, /\/static\/styles\/reuse\/layout\.css/);
});

test("nextcloud whiteboard share permissions use explicit access labels", async () => {
    const strings = await import("node:fs/promises").then((fs) =>
        fs.readFile(
            new URL("../ui/languages/en/strings.xml", import.meta.url),
            "utf8",
        ),
    );
    assert.match(strings, />Read-Only<\/string>/);
    assert.match(strings, />Read \+ Write<\/string>/);
    assert.doesNotMatch(strings, />Can edit<\/string>/);
});

test("nextcloud whiteboard disables page layout editing", async () => {
    const appSource = await import("node:fs/promises").then((fs) =>
        fs.readFile(new URL("../ui/app/index.js", import.meta.url), "utf8"),
    );
    assert.match(appSource, /allowCustomization:\s*false/);
});

test("direct-account SPA shares mount the full Whiteboard page", async () => {
    const appSource = await import("node:fs/promises").then((fs) =>
        fs.readFile(new URL("../ui/app/index.js", import.meta.url), "utf8"),
    );
    assert.match(
        appSource,
        /shareContext\?\.directAccess === true \? null : \(shareContext \?\? null\)/,
    );
});

test("nextcloud whiteboard app loads module strings and omits inline status element", async () => {
    const [
        source,
        canvasSource,
        presenceSource,
        realtimeSource,
        renderSource,
        textToolsSource,
        styles,
        presenceStyles,
    ] = await Promise.all([
        import("node:fs/promises").then((fs) =>
            fs.readFile(new URL("../ui/app/index.js", import.meta.url), "utf8"),
        ),
        import("node:fs/promises").then((fs) =>
            fs.readFile(
                new URL("../ui/whiteboard/canvas.js", import.meta.url),
                "utf8",
            ),
        ),
        import("node:fs/promises").then((fs) =>
            fs.readFile(
                new URL("../ui/app/presence.js", import.meta.url),
                "utf8",
            ),
        ),
        import("node:fs/promises").then((fs) =>
            fs.readFile(
                new URL("../ui/app/realtime.js", import.meta.url),
                "utf8",
            ),
        ),
        import("node:fs/promises").then((fs) =>
            fs.readFile(
                new URL("../ui/app/render.js", import.meta.url),
                "utf8",
            ),
        ),
        import("node:fs/promises").then((fs) =>
            fs.readFile(
                new URL("../ui/whiteboard/text-tools.js", import.meta.url),
                "utf8",
            ),
        ),
        import("node:fs/promises").then((fs) =>
            fs.readFile(
                new URL("../ui/styles/whiteboards.css", import.meta.url),
                "utf8",
            ),
        ),
        import("node:fs/promises").then((fs) =>
            fs.readFile(
                new URL(
                    "../../../ui/styles/reuse/presence.css",
                    import.meta.url,
                ),
                "utf8",
            ),
        ),
    ]);
    assert.match(
        source,
        /componentStringBaseUrls:\s*\[\s*"\/static\/modules\/nextcloud-whiteboard\/languages"/,
    );
    assert.doesNotMatch(source, /whiteboard-connection-status/);
    assert.match(source, /uiCtx\.capabilities\.get\("share:openPopup"\)/);
    assert.match(source, /resourceType:\s*"whiteboard"/);
    assert.match(source, /resourceId:\s*activeBoard\.id/);
    assert.match(source, /supportsReadOnly:\s*true/);
    assert.match(source, /readOnly:\s*session\.canWrite !== true/);
    assert.match(source, /mountedComposer\.destroy\(\)/);
    assert.match(
        source,
        /\/static\/gateways\/share\/ui\/reuse\/share-button\.js/,
    );
    assert.match(source, /showNavbar:\s*sharePageFlag\("showNavbar",\s*true\)/);
    assert.match(source, /requireAccountSession:\s*!activeShareContext/);
    assert.match(
        source,
        /requireAccountSession:\s*!activeShareContext,\s*signal/,
    );
    assert.match(source, /pageManifest:\s*\{/);
    assert.match(source, /pointerTracking:\s*true/);
    assert.match(
        source,
        /const canvasElement = document\.getElementById\("whiteboard-canvas"\);/,
    );
    assert.match(presenceSource, /function getPointerOffset\(canvasInstance\)/);
    assert.match(
        source,
        /getPointerOffset:\s*\(\) => getPointerOffset\(canvasInstance\)/,
    );
    assert.match(presenceSource, /function applyRemotePresenceSelections\(/);
    assert.match(
        source,
        /onPresenceUpdate:\s*\(entries, sessionId\) =>\s*applyRemotePresenceSelections/,
    );
    assert.match(textToolsSource, /loadFontsCatalog/);
    assert.match(textToolsSource, /whiteboard-text-menu/);
    assert.match(textToolsSource, /parentNode\?\.removeChild\(editor\)/);
    assert.match(canvasSource, /function getSelectedElementIds\(\)/);
    assert.match(canvasSource, /function setRemoteSelections\(/);
    assert.match(
        await import("node:fs/promises").then((fs) =>
            fs.readFile(
                new URL("../ui/whiteboard/render-scene.js", import.meta.url),
                "utf8",
            ),
        ),
        /remoteSelections\.get\(element\.id\)/,
    );
    assert.match(canvasSource, /function pushHistoryEntry\(/);
    assert.match(canvasSource, /function applyHistorySnapshot\(/);
    assert.match(renderSource, /id="page-presence-section"/);
    assert.match(
        renderSource,
        /class="whiteboard-toolbar-group" aria-live="polite"/,
    );
    assert.match(realtimeSource, /function throttleLatest\(callback, delay\)/);
    assert.match(source, /function updateHistoryControls\(\)/);
    assert.match(source, /whiteboard-toolbar-group\[hidden\]/);
    assert.match(source, /insertAdjacentHTML\(\s*"afterend"/);
    assert.match(
        source,
        /canvas\.onHistoryChange\?\.\(updateHistoryControls\)/,
    );
    assert.match(source, /redoButton\?\.addEventListener\("click"/);
    assert.match(
        source,
        /if \(canWrite && meta\?\.transient !== true\) persistChanges\(elements\)/,
    );
    assert.match(styles, /#page-presence-section\s*\{[^}]*flex:\s*0 0 auto;/s);
    assert.match(
        styles,
        /#page-presence-section\s*\{[^}]*width:\s*fit-content;/s,
    );
    assert.match(
        styles,
        /#page-presence-section\s*\{[^}]*justify-content:\s*flex-start;/s,
    );
    assert.match(styles, /#page-presence-section\s*\{[^}]*margin-left:\s*0;/s);
    assert.match(
        presenceStyles,
        /\.page-presence__avatar-img\s*\{[^}]*height:\s*2rem;[^}]*object-fit:\s*cover;[^}]*width:\s*2rem;/s,
    );
    assert.match(styles, /\.whiteboard-text-menu/);
    assert.doesNotMatch(source, /share-adapter\.js/);
});

test("nextcloud whiteboard canvas deletes selected objects via keyboard", async () => {
    const [source, canvasEventsSource] = await Promise.all([
        import("node:fs/promises").then((fs) =>
            fs.readFile(
                new URL("../ui/whiteboard/canvas.js", import.meta.url),
                "utf8",
            ),
        ),
        import("node:fs/promises").then((fs) =>
            fs.readFile(
                new URL("../ui/whiteboard/canvas-events.js", import.meta.url),
                "utf8",
            ),
        ),
    ]);
    assert.match(source, /function deleteSelectedElements\(\)/);
    assert.match(source, /getElementAnchorPoints,/);
    assert.match(source, /parseSavedFont, toFontFamilyValue/);
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
        canvasEventsSource,
        /canvasElement\.addEventListener\("keydown", onKeyDown\)/,
    );
    assert.match(
        canvasEventsSource,
        /canvasElement\.removeEventListener\("keydown", onKeyDown\)/,
    );
});

test("nextcloud whiteboard image paste saves and selects resizable image objects", async () => {
    const [canvasSource, clipboardSource, canvasEventsSource, elementsSource] =
        await Promise.all([
            import("node:fs/promises").then((fs) =>
                fs.readFile(
                    new URL("../ui/whiteboard/canvas.js", import.meta.url),
                    "utf8",
                ),
            ),
            import("node:fs/promises").then((fs) =>
                fs.readFile(
                    new URL(
                        "../ui/whiteboard/clipboard-images.js",
                        import.meta.url,
                    ),
                    "utf8",
                ),
            ),
            import("node:fs/promises").then((fs) =>
                fs.readFile(
                    new URL(
                        "../ui/whiteboard/canvas-events.js",
                        import.meta.url,
                    ),
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
        clipboardSource,
        /function createImageElementFromDataUrl\(dataUrl\)/,
    );
    assert.match(clipboardSource, /commitCreatedElement\(\s*buildImageElement/);
    assert.match(
        canvasEventsSource,
        /document\.addEventListener\("paste", onPaste\)/,
    );
    assert.match(clipboardSource, /if \(event\.defaultPrevented\) return/);
    assert.match(clipboardSource, /findClipboardImageFile\(event\)/);
    assert.doesNotMatch(
        canvasSource,
        /commitElements\(\[\s*\.\.\.elements,\s*buildImageElement/,
    );
    assert.match(elementsSource, /const imageElementCache = new Map\(\)/);
    assert.match(elementsSource, /whiteboard:image-loaded/);
    assert.match(
        canvasEventsSource,
        /addEventListener\("whiteboard:image-loaded", scheduleRender\)/,
    );
    assert.match(
        elementsSource,
        /export function buildImageElement\(point, dataUrl, dimensions = \{\}\)/,
    );
});

test("nextcloud whiteboard defaults to select after canvas refresh", async () => {
    const [canvasSource, appSource, renderSource] = await Promise.all([
        import("node:fs/promises").then((fs) =>
            fs.readFile(
                new URL("../ui/whiteboard/canvas.js", import.meta.url),
                "utf8",
            ),
        ),
        import("node:fs/promises").then((fs) =>
            fs.readFile(new URL("../ui/app/index.js", import.meta.url), "utf8"),
        ),
        import("node:fs/promises").then((fs) =>
            fs.readFile(
                new URL("../ui/app/render.js", import.meta.url),
                "utf8",
            ),
        ),
    ]);
    assert.match(canvasSource, /let activeTool = "select"/);
    assert.match(renderSource, /tool === "select" \? " active" : ""/);
    assert.match(
        appSource + renderSource,
        /data-tool="\$\{tool\}" class="whiteboard-tool/,
    );
    assert.match(
        appSource + renderSource,
        /toolButton\("pen", "module.nextcloud_whiteboard.tool_pen", "✎"\)/,
    );
    assert.match(
        appSource,
        /const SYNC_MESSAGE_BOARD_RENAMED = "BOARD_RENAMED"/,
    );
    assert.match(appSource, /function canRenameActiveBoard\(\)/);
    assert.match(appSource, /function emitBoardRenamed\(title\)/);
    assert.match(appSource, /function syncBoardUrl\(boardId\)/);
    assert.match(appSource, /searchParams\.set\("instantCanvas", "1"\)/);
    assert.match(
        appSource,
        /window\.history\.replaceState\(null, "", nextUrl\)/,
    );
});
test("nextcloud whiteboard entrusts its internal URL to the share popup", async () => {
    const appSource = await import("node:fs/promises").then((fs) =>
        fs.readFile(new URL("../ui/app/index.js", import.meta.url), "utf8"),
    );
    assert.match(
        appSource,
        /contentUrl: `\/whiteboard\?id=\$\{encodeURIComponent\(activeBoard\.id\)\}`/,
    );
});

test("whiteboard suspends realtime work while its tab is hidden", async () => {
    const [appSource, realtimeSource] = await Promise.all(
        ["../ui/app/index.js", "../ui/app/realtime.js"].map((relativePath) =>
            import("node:fs/promises").then((fs) =>
                fs.readFile(new URL(relativePath, import.meta.url), "utf8"),
            ),
        ),
    );
    assert.match(appSource, /document\.hidden[\s\S]*socket\.disconnect\(\)/);
    assert.match(appSource, /socket\.connect\(\)/);
    assert.match(appSource, /socketInstance\.cognisCleanup\?\.\(\)/);
    assert.match(realtimeSource, /window\.setTimeout[\s\S]*10_000/);
    assert.match(realtimeSource, /script\.remove\(\)/);
    assert.match(
        appSource,
        /const mountedComposer = createPageComposer[\s\S]*signal\?\.addEventListener\([\s\S]*mountedComposer\.destroy\(\)/,
    );
    assert.match(appSource, /if \(signal\?\.aborted\) return/);
});
