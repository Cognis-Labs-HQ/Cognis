import { uiCtx } from "../../../ui-ctx.js";
import { openPopup } from "../../../popup.js";

const api = uiCtx.capabilities.get("ui:tutorials");
const fixturePath = window.location.pathname;
const counts = { inside: 0, outside: 0, cleanup: 0 };
let owner, session, pendingCallback;
let sequence = 0;
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
    async start({
        effects,
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
