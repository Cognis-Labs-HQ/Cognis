import { uiCtx } from "../../../ui-ctx.js";
import { openPopup } from "../../../popup.js";

const api = uiCtx.capabilities.get("ui:tutorials");
const fixturePath = window.location.pathname;
const counts = { inside: 0, outside: 0, cleanup: 0 };
let owner, session, pendingCallback;
let sequence = 0;
let menuLifetime;
let permitted = true;
let target = document.querySelector("#target");
const connectTarget = () =>
    target.addEventListener("click", () => {
        counts.inside++;
    });
connectTarget();
document.querySelector("#outside").addEventListener("click", () => {
    counts.outside++;
});

window.tutorialFixture = {
    counts,
    api,
    async broadcast() {
        await uiCtx.capabilities.get("ui:broadcast").prepare();
        const banner = uiCtx.capabilities
            .get("ui:broadcast")
            .publish("tutorial-test", {
                title: "Service notice",
                bodyHtml:
                    "Broadcast details remain visible during the tutorial.",
                actionsHtml:
                    '<button id="banner-action" type="button">Broadcast action</button>',
            });
        banner.element
            .querySelector("#banner-action")
            .addEventListener("click", () => {
                counts.broadcast = (counts.broadcast ?? 0) + 1;
            });
        return banner;
    },
    async menuQueue() {
        menuLifetime?.abort();
        menuLifetime = new AbortController();
        const { mountComposerFloatingMenu } =
            await import("../../../page-composer/floating-menu.js");
        document.querySelector("#queue-example")?.remove();
        const root = document.createElement("section");
        root.id = "queue-example";
        root.innerHTML = '<div class="floating-toolbar" hidden></div>';
        document.body.append(root);
        mountComposerFloatingMenu({
            root,
            signal: menuLifetime.signal,
            ctx: uiCtx,
            items: [
                {
                    id: "module-actions",
                    render: () =>
                        '<button id="queued-module-action" type="button">Module action</button>',
                },
            ],
        });
        const slot = root.querySelector("[data-floating-slot]");
        slot.hidden = false;
        counts.menuActions = 0;
        slot.querySelector("button").addEventListener(
            "click",
            () => counts.menuActions++,
        );
        await this.cue(true);
    },
    updateQueuedMenu() {
        const slot = document
            .querySelector(
                "#queue-example>[hidden],#queue-example>.floating-toolbar",
            )
            .querySelector("[data-floating-slot]");
        slot.hidden = true;
        slot.hidden = false;
    },
    disposeQueuedMenu() {
        menuLifetime?.abort();
    },
    async components(options) {
        owner?.dispose();
        const { mountComponentExample } =
            await import("../../../../app/administration/tests/fixtures/tutorials.js");
        return mountComponentExample(api, options);
    },
    async cue(highlightNext) {
        owner?.dispose();
        owner = api.owner("browser.cue", {
            signal: new AbortController().signal,
            i18n: { t: (key) => key },
        });
        const registration = await owner.register({
            version: 1,
            id: "cue",
            page: window.location.pathname,
            titleKey: "Cue",
            steps: [
                {
                    id: "manual",
                    titleKey: "Continue",
                    ...(highlightNext === undefined ? {} : { highlightNext }),
                },
            ],
        });
        session = await registration.start();
        await session.ready;
        return session.state();
    },
    async chooser() {
        localStorage.setItem(
            "cognis_tutorial:tutorial-browser:browser:first-visit",
            "completed",
        );
        localStorage.setItem(
            "cognis_tutorial:tutorial-browser:browser:second-guide",
            "completed",
        );
        await this.bindPage({ reset: false });
        await owner.register({
            version: 1,
            page: ({ pathname }) => pathname === fixturePath,
            id: "second-guide",
            titleKey: "second-guide",
            steps: [{ id: "one", titleKey: "second-guide" }],
        });
        await api.refreshPage();
    },
    async startWorkspace() {
        session = await uiCtx.capabilities
            .get("ui:workspaceTutorial")
            .start({ firstTime: true });
        await session.ready;
        return session.state();
    },
    async workspace(options) {
        owner?.dispose();
        const { mountWorkspace } = await import("./workspace.js");
        return mountWorkspace(options);
    },
    async start({
        effects,
        preventNavigation = false,
        blocking = false,
        event = false,
        missing = "cancel",
        waiting = false,
        unsafeText = false,
        firstTime = false,
    } = {}) {
        owner?.dispose();
        permitted = true;
        pendingCallback = undefined;
        counts.inside = 0;
        counts.outside = 0;
        document.querySelector("#launcher").focus({ preventScroll: true });
        const lifetime = new AbortController();
        owner = api.owner("browser", {
            signal: lifetime.signal,
            i18n: {
                t: (key) =>
                    unsafeText && key === "body"
                        ? "<img src=x onerror=window.unsafe=true>"
                        : `Content ${key}`,
            },
        });
        const published = await owner.target("control", {
            resolve: () => target,
        });
        const play = await owner.register({
            version: 1,
            page: ({ pathname }) => pathname === fixturePath,
            id: `case-${++sequence}`,
            titleKey: "title",
            available: () => permitted,
            steps: [
                {
                    id: "target",
                    preventNavigation,
                    titleKey: "step",
                    bodyKey: "body",
                    target: published.id,
                    effects: effects ?? {
                        callout: true,
                        arrow: true,
                        spotlight: true,
                    },
                    interaction: blocking ? "target" : "free",
                    missing: { timeoutMs: 0, action: missing },
                    ...(event ? { advance: { event: "click" } } : {}),
                    ...(waiting
                        ? {
                              enter: () =>
                                  new Promise((resolve) => {
                                      pendingCallback = resolve;
                                  }),
                          }
                        : {}),
                },
                { id: "last", titleKey: "last" },
            ],
        });
        session = await play.start({ firstTime });
        if (!waiting) await session.ready;
        return this.status();
    },
    async bindPage({ reset = true } = {}) {
        owner?.dispose();
        localStorage.setItem("cognis_account", "tutorial-browser");
        if (reset)
            localStorage.removeItem(
                "cognis_tutorial:tutorial-browser:browser:first-visit",
            );
        uiCtx.capabilities.contribute("session:isAuthenticated", () =>
            Boolean(localStorage.getItem("cognis_account")),
        );
        owner = api.owner("browser", {
            signal: new AbortController().signal,
            i18n: { t: (key) => `Content ${key}` },
        });
        await owner.register({
            version: 1,
            page: ({ pathname }) => pathname === fixturePath,
            id: "first-visit",
            titleKey: "title",
            steps: [
                { id: "one", titleKey: "one" },
                { id: "two", titleKey: "two" },
            ],
        });
        await uiCtx.runFlow("page:mounted", {
            pathname: window.location.pathname,
        });
        await api.refreshPage();
        return this.status();
    },
    status() {
        return {
            state: api.current(),
            layers: document.querySelectorAll(".tutorial-layer").length,
            blocking: Boolean(
                document.querySelector('.tutorial-layer[data-blocking="true"]'),
            ),
            counts: { ...counts },
            pendingCallback: typeof pendingCallback === "function",
        };
    },
    cancel: () => session.cancel(),
    next: () => session.next(),
    back: () => session.back(),
    finishCallback() {
        pendingCallback?.(() => {
            counts.cleanup++;
        });
    },
    losePermission() {
        permitted = false;
    },
    removeTarget() {
        target.remove();
    },
    restoreTarget() {
        target = document.createElement("button");
        target.type = "button";
        target.id = "target";
        target.textContent = "Target";
        connectTarget();
        document.querySelector("#content").append(target);
    },
    async popup() {
        void openPopup({
            title: "Required confirmation",
            body: "The tutorial must yield to this dialog.",
            mandatory: true,
            actions: [{ id: "done", label: "Done", variant: "confirm" }],
        });
    },
    dispose: () => owner.dispose(),
};
