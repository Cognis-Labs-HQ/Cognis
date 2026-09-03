import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pageSectionStyles = readFileSync(
    new URL("../../styles/reuse/page-sections.css", import.meta.url),
    "utf8",
);
const dashboardLayoutSource = readFileSync(
    new URL("../../layouts/dashboard-layout.js", import.meta.url),
    "utf8",
);

class FakeElement {
    constructor() {
        this.attributes = {};
        this.children = [];
        this.dataset = {};
        this.listeners = new Map();
        this.classNames = new Set();
        this.classList = {
            add: (...names) =>
                names.forEach((name) => this.classNames.add(name)),
            remove: (...names) =>
                names.forEach((name) => this.classNames.delete(name)),
        };
    }

    addEventListener(type, listener) {
        this.listeners.set(type, listener);
    }

    append(child) {
        child.parentElement = this;
        this.children.push(child);
    }

    querySelector(selector) {
        if (selector !== ".component-page-window") return null;
        return (
            this.children.find((child) =>
                child.className?.split(" ").includes("component-page-window"),
            ) ?? null
        );
    }

    remove() {
        if (!this.parentElement) return;
        this.parentElement.children = this.parentElement.children.filter(
            (child) => child !== this,
        );
        this.parentElement = null;
    }

    setAttribute(name, value) {
        this.attributes[name] = value;
    }
}

function catalogResponse() {
    return new Response(
        JSON.stringify({
            data: [
                {
                    id: "whiteboard.canvas",
                    ownerUuid: "b7bf4a0a-a07a-483e-a736-21f97d703ce6",
                    pattern: "^/whiteboards/[^/]+$",
                    base: "/whiteboards",
                    scriptUrl: "/static/modules/whiteboard/app.js",
                    componentPage: {
                        labelKey: "module.whiteboard.canvas_label",
                        descriptionKey: "module.whiteboard.canvas_description",
                        modes: ["fullscreen"],
                    },
                },
                {
                    id: "private.settings",
                    ownerUuid: "b7bf4a0a-a07a-483e-a736-21f97d703ce6",
                    pattern: "^/private$",
                    base: "/private",
                    scriptUrl: "/private.js",
                },
            ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
    );
}

test("component windows stay disposable across activation and SPA navigation", async () => {
    globalThis.localStorage = { getItem: () => "test-token" };
    const windowListeners = new Map();
    globalThis.window = {
        addEventListener: (type, listener) =>
            windowListeners.set(type, listener),
        dispatchEvent: (event) => windowListeners.get(event.type)?.(event),
        innerHeight: 800,
        scrollBy: (options) => (globalThis.__componentPageScroll = options),
        location: {
            origin: "https://cognis.test",
            pathname: "/meetings/meeting-2",
        },
    };
    const componentStage = new FakeElement();
    const componentStages = new Map([
        ["meeting-whiteboard-stage", componentStage],
    ]);
    const appPageMain = new FakeElement();
    componentStage.closest = (selector) =>
        selector === ".app-page__main" ? appPageMain : null;
    const appRoot = new FakeElement();
    appRoot.dataset.activePage = "meetings";
    globalThis.document = {
        createElement: () => new FakeElement(),
        getElementById: (elementId) => componentStages.get(elementId) ?? null,
        querySelector: (selector) => (selector === "#app" ? appRoot : null),
    };
    globalThis.fetch = async () => catalogResponse();

    const { resolveComponentPage } = await import("../spa-route-registry.js");
    const {
        installComponentPageBroker,
        requestComponentPage,
        spawnComponentPage,
    } = await import("../component-page-broker.js");
    const { uiCtx } = await import("../ui-ctx.js");
    let spawnAuthorized = false;
    let mountedComponentPage = null;
    let releasedMount = false;
    let routeLoadGate = null;
    const entryModuleUrl = new URL("../page-entry.js", import.meta.url).href;
    const directEntrySource = `
        import { mountWhenDirect } from ${JSON.stringify(entryModuleUrl)};
        export async function mount(root) {
            globalThis.__componentPageMountRoots.push(root);
            return () => globalThis.__componentPageDiscards++;
        }
        await mountWhenDirect(mount);
    `;
    const directEntryUrl = `data:text/javascript,${encodeURIComponent(directEntrySource)}`;
    globalThis.__componentPageMountRoots = [];
    globalThis.__componentPageDiscards = 0;
    globalThis.__componentPageScroll = null;
    installComponentPageBroker({
        authorizeSpawn: () => spawnAuthorized,
        resolveLocal: async ({ componentUuid, routeId }) => {
            if (
                componentUuid &&
                componentUuid !== "b4d49c4a-61d0-5db2-84fd-f89b80fd6398"
            ) {
                return null;
            }
            if (routeId === "direct-entry") {
                return {
                    id: routeId,
                    load: () => import(directEntryUrl),
                };
            }
            return routeId === "core.dashboard"
                ? {
                      id: routeId,
                      load: async () => {
                          await routeLoadGate;
                          return {
                              mount: async (root, options) => {
                                  mountedComponentPage = { root, options };
                                  return () => {
                                      releasedMount = true;
                                  };
                              },
                          };
                      },
                  }
                : null;
        },
    });
    const shareContext = {
        resourceType: "meeting",
        guestAccessToken: "guest-token",
    };
    uiCtx.extendFlow(
        "spawn-component-page",
        "prepare",
        { id: "test:provide-component-mount-options", order: 100 },
        ({ data }) => {
            if (!data.route) return;
            data.mountOptions = { shareContext };
        },
    );

    const declaredRouteResolver = uiCtx.capabilities.get(
        "router:resolveDeclaredRoute",
    );
    assert.equal(
        (
            await declaredRouteResolver({
                kind: "route",
                routeId: "core.dashboard",
            })
        )?.id,
        "core.dashboard",
    );

    assert.equal(
        (
            await resolveComponentPage({
                componentUuid: "b7bf4a0a-a07a-483e-a736-21f97d703ce6",
                routeId: "whiteboard.canvas",
            })
        )?.id,
        "whiteboard.canvas",
    );
    assert.equal(
        await resolveComponentPage({
            componentUuid: "b7bf4a0a-a07a-483e-a736-21f97d703ce6",
            routeId: "private.settings",
        }),
        null,
    );

    const resolvedPage = await requestComponentPage({
        componentUuid: "b4d49c4a-61d0-5db2-84fd-f89b80fd6398",
        routeId: "core.dashboard",
        elementId: "meeting-whiteboard-stage",
        context: { meetingId: "meeting-1" },
    });
    assert.equal(resolvedPage?.id, "core.dashboard");
    assert.equal(componentStage.children.length, 0);
    assert.equal(mountedComponentPage, null);
    assert.equal(
        await spawnComponentPage({
            componentUuid: "b4d49c4a-61d0-5db2-84fd-f89b80fd6398",
            routeId: "core.dashboard",
            elementId: "meeting-whiteboard-stage",
        }),
        null,
    );

    spawnAuthorized = true;
    const callerController = new AbortController();
    const componentWindow = await uiCtx.capabilities.get(
        "component-pages:spawn",
    )({
        componentUuid: "b4d49c4a-61d0-5db2-84fd-f89b80fd6398",
        routeId: "core.dashboard",
        elementId: "meeting-whiteboard-stage",
        context: { meetingId: "meeting-2" },
        signal: callerController.signal,
        borderless: true,
    });
    assert.equal(componentWindow?.elementId, "meeting-whiteboard-stage");
    assert.equal(componentWindow?.borderless, true);
    assert.equal(componentStage.children.length, 1);
    assert.equal(componentStage.classNames.has("component-page-stage"), true);
    assert.equal(
        componentStage.classNames.has("component-page-stage--borderless"),
        true,
    );
    assert.equal(
        appPageMain.classNames.has("app-page__main--component-borderless"),
        true,
    );
    assert.equal(
        componentStage.children[0].classNames.has(
            "component-page-window--borderless",
        ),
        true,
    );
    assert.equal(mountedComponentPage?.root, componentStage.children[0]);
    assert.equal(
        mountedComponentPage?.options.focusState.meetingId,
        "meeting-2",
    );
    assert.equal(mountedComponentPage?.options.navigationAllowed, false);
    assert.equal(mountedComponentPage?.options.borderless, true);
    assert.equal(mountedComponentPage?.options.shareContext, shareContext);
    assert.deepEqual(mountedComponentPage?.options.layout, {
        borderless: true,
        fillParent: true,
        scrollOwner: "document",
    });
    assert.notEqual(
        mountedComponentPage?.options.signal,
        callerController.signal,
    );

    let navigationPrevented = false;
    let navigationStopped = false;
    componentStage.children[0].listeners.get("click")({
        type: "click",
        target: { closest: () => ({ href: "/settings" }) },
        preventDefault: () => (navigationPrevented = true),
        stopImmediatePropagation: () => (navigationStopped = true),
    });
    assert.equal(navigationPrevented, true);
    assert.equal(navigationStopped, true);

    let wheelPrevented = false;
    let wheelStopped = false;
    componentStage.children[0].listeners.get("wheel")({
        deltaMode: 1,
        deltaX: 0,
        deltaY: 3,
        preventDefault: () => (wheelPrevented = true),
        stopImmediatePropagation: () => (wheelStopped = true),
    });
    assert.equal(wheelPrevented, true);
    assert.equal(wheelStopped, true);
    assert.deepEqual(globalThis.__componentPageScroll, {
        left: 0,
        top: 48,
        behavior: "auto",
    });

    assert.equal(
        await uiCtx.capabilities.get("component-pages:discard")(
            "meeting-whiteboard-stage",
        ),
        true,
    );
    assert.equal(releasedMount, true);
    assert.equal(componentStage.children.length, 0);
    assert.equal(componentStage.classNames.has("component-page-stage"), false);
    assert.equal(
        componentStage.classNames.has("component-page-stage--borderless"),
        false,
    );

    const temporaryStageHost = new FakeElement();
    const temporaryStage = new FakeElement();
    temporaryStageHost.append(temporaryStage);
    componentStages.set("temporary-call-stage", temporaryStage);
    const temporaryWindow = await spawnComponentPage({
        componentUuid: "b4d49c4a-61d0-5db2-84fd-f89b80fd6398",
        routeId: "core.dashboard",
        elementId: "temporary-call-stage",
        removeStageOnDiscard: true,
    });
    assert.ok(temporaryWindow);
    await temporaryWindow.discard();
    assert.equal(temporaryStageHost.children.length, 0);
    assert.equal(
        appPageMain.classNames.has("app-page__main--component-borderless"),
        false,
    );
    assert.equal(
        await uiCtx.capabilities.get("component-pages:discard")(
            "meeting-whiteboard-stage",
        ),
        false,
    );

    releasedMount = false;
    const navigationController = new AbortController();
    await spawnComponentPage({
        componentUuid: "b4d49c4a-61d0-5db2-84fd-f89b80fd6398",
        routeId: "core.dashboard",
        elementId: "meeting-whiteboard-stage",
        signal: navigationController.signal,
    });
    window.dispatchEvent({ type: "cognis:route-will-change" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(releasedMount, true);
    assert.equal(componentStage.children.length, 0);

    releasedMount = false;
    await spawnComponentPage({
        componentUuid: "b4d49c4a-61d0-5db2-84fd-f89b80fd6398",
        routeId: "core.dashboard",
        elementId: "meeting-whiteboard-stage",
        signal: navigationController.signal,
    });
    navigationController.abort();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(releasedMount, true);
    assert.equal(componentStage.children.length, 0);

    const originalPathname = window.location.pathname;
    const directEntryWindow = await spawnComponentPage({
        componentUuid: "b4d49c4a-61d0-5db2-84fd-f89b80fd6398",
        routeId: "direct-entry",
        elementId: "meeting-whiteboard-stage",
    });
    assert.equal(directEntryWindow?.routeId, "direct-entry");
    assert.deepEqual(globalThis.__componentPageMountRoots, [
        componentStage.children[0],
    ]);
    assert.equal(globalThis.__componentPageMountRoots.includes(appRoot), false);
    assert.equal(window.location.pathname, originalPathname);
    assert.equal(appRoot.dataset.activePage, "meetings");
    await uiCtx.capabilities.get("component-pages:discardAll")();
    assert.equal(globalThis.__componentPageDiscards, 1);
    assert.equal(componentStage.children.length, 0);
    assert.equal(appRoot.dataset.activePage, "meetings");

    let releaseRouteLoad;
    routeLoadGate = new Promise((resolve) => (releaseRouteLoad = resolve));
    const racingSpawn = spawnComponentPage({
        componentUuid: "b4d49c4a-61d0-5db2-84fd-f89b80fd6398",
        routeId: "core.dashboard",
        elementId: "meeting-whiteboard-stage",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    window.dispatchEvent({ type: "cognis:route-will-change" });
    releaseRouteLoad();
    assert.equal(await racingSpawn, null);
    assert.equal(componentStage.children.length, 0);
});

test("component windows grow with content without nested vertical scrolling", () => {
    assert.match(
        pageSectionStyles,
        /\.app-page__main--component-borderless\s*{[^}]*margin: 0;/,
    );
    assert.match(
        pageSectionStyles,
        /\.component-page-stage\s*{[^}]*display: flex;[^}]*overflow-y: visible;[^}]*contain: layout style;/,
    );
    assert.match(
        pageSectionStyles,
        /\.component-page-stage--borderless\s*{[^}]*display: grid;[^}]*grid-template-rows: minmax\(min-content, 1fr\);[^}]*align-items: stretch;/,
    );
    assert.match(
        pageSectionStyles,
        /\.component-page-window\s*{[^}]*position: relative;[^}]*flex: 1 0 auto;[^}]*min-height: 100%;[^}]*overflow: visible;/,
    );
    assert.match(
        pageSectionStyles,
        /\.component-page-window--borderless\s*{[^}]*display: grid;[^}]*grid-template-rows: minmax\(min-content, 1fr\);[^}]*width: 100%;[^}]*height: auto;[^}]*min-height: 100%;[^}]*margin: 0;[^}]*padding: 0;[^}]*overflow: visible;[^}]*border: 0;/,
    );
    assert.match(
        pageSectionStyles,
        /\.component-page-window--borderless > :first-child\s*{[^}]*width: 100%;[^}]*height: 100%;[^}]*min-height: 100%;[^}]*margin: 0;[^}]*padding: 0;/,
    );
    assert.match(
        pageSectionStyles,
        /\.component-page-window--borderless > \.workspace,[\s\S]*\.component-page-window--borderless > \.app-shell > \.workspace\s*{[^}]*height: 100%;[^}]*margin: 0;[^}]*padding: 0;[^}]*background: transparent;/,
    );
    assert.match(
        pageSectionStyles,
        /\.component-page-window--borderless > \.workspace \.composer-view-grid,[\s\S]*\.app-shell[\s\S]*\.composer-view-grid\s*{[^}]*height: 100%;[^}]*min-height: 100%;[^}]*grid-auto-rows: minmax\(min-content, 1fr\);[^}]*gap: 0;/,
    );
    assert.match(
        pageSectionStyles,
        /\.component-page-window--borderless[\s\S]*:is\([\s\S]*\.widget-card,[\s\S]*\.content-panel,[\s\S]*\.content-grid[\s\S]*\)[^{]*{[\s\S]*?margin: 0;[\s\S]*?padding: 0;[\s\S]*?border: 0;/,
    );
    assert.match(
        pageSectionStyles,
        /\.component-page-window--borderless[\s\S]*\.workspace[\s\S]*:is\([\s\S]*\.main-window,[\s\S]*\.content-grid,[\s\S]*\.content-panel,[\s\S]*\.content-section,[\s\S]*\.widget-card[\s\S]*\)\s*{[^}]*width: 100%;[^}]*height: 100%;[^}]*min-height: 0;/,
    );
    assert.match(
        pageSectionStyles,
        /\.component-page-window--borderless \.widget-card > :only-child\s*{[^}]*width: 100%;[^}]*height: 100%;[^}]*min-height: 0;/,
    );
});

test("component windows suppress nested dashboard chrome", () => {
    assert.match(
        dashboardLayoutSource,
        /root\.closest\?\.\("\.component-page-window"\)[\s\S]*showTopbar: false,[\s\S]*showNavbar: false,[\s\S]*showThemeToggle: false,[\s\S]*showFooter: false,[\s\S]*enableAccountEnhancements: false[\s\S]*if \(!componentWindow\) {[\s\S]*bindLanguageToggle/,
    );
});
