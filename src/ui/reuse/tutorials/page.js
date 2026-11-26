/**
 * Coordinates page discovery, account-scoped completion and header replay controls.
 * Public export: createPageTutorials — creates a lifecycle-owned page coordinator.
 * @example const page = createPageTutorials(dependencies); page.connect();
 * @param {object} dependencies Public ctx, tutorial, document, account completion and localization boundaries.
 * @returns {{refresh: Function, open: Function, complete: Function, connect: Function, dispose: Function}} Page operations.
 */
import { createFloatingMenu } from "../floating-menu.js";

export function createPageTutorials({
    ctx,
    api,
    document,
    account,
    completions,
    localize,
    prepareStyles,
    report,
}) {
    const window = document.defaultView;
    const controller = new AbortController();
    const signal = ctx.signal
        ? AbortSignal.any([ctx.signal, controller.signal])
        : controller.signal;
    const attempted = new Set();
    const automaticSurfaces = new Set();
    let help,
        menu,
        pending,
        queued = false,
        navigating = false;
    let epoch = 0;
    let completionFailure;
    const location = () => ({ pathname: window.location.pathname });
    // Completion follows the stable owner/tutorial ID, never content or package revisions.
    const key = (actor, id) =>
        `cognis_tutorial:${encodeURIComponent(actor)}:${id}`;
    function schedule() {
        if (queued || signal.aborted) return;
        queued = true;
        queueMicrotask(() => {
            queued = false;
            void api.refreshPage().catch(report);
        });
    }
    let repeat = false;
    async function refresh() {
        if (signal.aborted || navigating) return;
        if (pending) {
            repeat = true;
            return pending;
        }
        pending = update().finally(() => {
            pending = undefined;
            if (repeat) {
                repeat = false;
                schedule();
            }
        });
        return pending;
    }
    async function update() {
        const revision = epoch;
        const page = location();
        const actor = account();
        const header = document.querySelector(".page-context");
        const heading = header?.querySelector("h1");
        if (!heading) {
            help?.remove();
            help = null;
            menu?.dispose();
            return;
        }
        const plays = await api.list({ page });
        if (
            signal.aborted ||
            revision !== epoch ||
            !header?.isConnected ||
            !heading?.isConnected ||
            account() !== actor ||
            window.location.pathname !== page.pathname
        )
            return;
        if (!plays.length) {
            help?.remove();
            help = null;
            menu?.dispose();
            return;
        }
        const i18n = await localize();
        await prepareStyles();
        if (
            signal.aborted ||
            revision !== epoch ||
            !header.isConnected ||
            !heading.isConnected ||
            account() !== actor
        )
            return;
        if (!help?.isConnected || help.parentElement !== heading) {
            help?.remove();
            help = document.createElement("button");
            help.type = "button";
            help.className = "tutorial-help btn-neutral";
            const icon = document.createElement("span");
            icon.className = "tutorial-help-icon";
            icon.setAttribute("aria-hidden", "true");
            help.append(icon);
            help.addEventListener(
                "click",
                () => {
                    void api.openPage().catch(report);
                },
                { signal },
            );
            heading.append(help);
        }
        help.setAttribute("aria-label", i18n.t("ui.tutorial.replay"));
        const ready = ctx.capabilities.get("ui:pageReadiness");
        if (!ready) throw new Error("page_readiness_unavailable");
        help.disabled = !ready.isReady();
        if (
            !actor ||
            !ready.isReady() ||
            api.current() ||
            document.querySelector(".popup-overlay--visible")
        )
            return;
        const surface = JSON.stringify([actor, page.pathname, plays[0].id]);
        if (automaticSurfaces.has(surface)) return;
        const completionScope = JSON.stringify([actor, revision]);
        if (completionFailure === completionScope) return;
        let completed;
        try {
            completed = await completions.load(actor);
        } catch (error) {
            completionFailure = completionScope;
            throw error;
        }
        if (
            signal.aborted ||
            revision !== epoch ||
            account() !== actor ||
            !ready.isReady() ||
            api.current()
        )
            return;
        const first = plays.find(
            (play) =>
                play.automatic !== false &&
                !attempted.has(key(actor, play.id)) &&
                !completed.has(play.id),
        );
        if (!first) return;
        automaticSurfaces.add(surface);
        return start(first.id, actor);
    }
    async function start(id, actor) {
        if (signal.aborted || account() !== actor) return false;
        const completed = actor ? await completions.load(actor) : new Set();
        if (signal.aborted || account() !== actor) return false;
        completionFailure = undefined;
        const firstTime = Boolean(actor && !completed.has(id));
        attempted.add(key(actor, id));
        const session = await api.start(id, { firstTime });
        void session.finished
            .then(() => {
                // An intentional guide can cross routes; do not auto-start it again on arrival.
                if (account() === actor) attempted.add(key(actor, id));
                schedule();
            })
            .catch(report);
        return session;
    }
    async function complete(actor, id) {
        if (!actor) return;
        if (signal.aborted || account() !== actor)
            throw new Error("tutorial_completion_identity_changed");
        await completions.complete(actor, id);
        schedule();
    }
    async function open() {
        const revision = epoch;
        const page = location();
        const actor = account();
        const plays = await api.list({ page });
        if (
            signal.aborted ||
            revision !== epoch ||
            account() !== actor ||
            api.current() ||
            !ctx.capabilities.get("ui:pageReadiness").isReady() ||
            !plays.length
        )
            return false;
        menu?.dispose();
        if (plays.length === 1) return start(plays[0].id, actor);
        const i18n = await localize();
        await prepareStyles();
        if (signal.aborted || revision !== epoch || account() !== actor)
            return false;
        menu = createFloatingMenu({
            document,
            priority: 100,
            ctx,
            label: i18n.t("ui.reuse.tutorials"),
            signal,
            items: [
                ...plays.map((play) => ({
                    id: play.id,
                    label: play.title,
                    execute() {
                        menu.dispose();
                        void start(play.id, actor).catch(report);
                    },
                })),
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                    execute: () => menu.dispose(),
                },
            ],
        });
        menu.element.classList.add("tutorial-actions");
        for (const choice of menu.element.querySelectorAll("button"))
            if (choice.dataset.action !== "cancel")
                choice.classList.add("tutorial-next-prompt");
        const chooser = menu;
        if (
            !(await chooser.ready) ||
            menu !== chooser ||
            signal.aborted ||
            revision !== epoch
        )
            return false;
        chooser.element.querySelector("button")?.focus();
        return true;
    }
    function connect() {
        if (!document.body) {
            document.addEventListener("DOMContentLoaded", connect, {
                once: true,
                signal,
            });
            return;
        }
        const observer = new window.MutationObserver(schedule);
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class", "hidden", "aria-hidden"],
        });
        signal.addEventListener(
            "abort",
            () => {
                observer.disconnect();
                help?.remove();
                menu?.dispose();
            },
            { once: true },
        );
        window.addEventListener("cognis:tutorial-changed", schedule, {
            signal,
        });
        window.addEventListener(
            "cognis:route-will-change",
            () => {
                epoch++;
                completions.invalidate();
                attempted.clear();
                navigating = true;
                menu?.dispose();
                help?.remove();
            },
            { signal },
        );
        window.addEventListener(
            "popstate",
            () => {
                epoch++;
                completions.invalidate();
                attempted.clear();
                menu?.dispose();
                schedule();
            },
            { signal },
        );
        window.addEventListener("storage", schedule, { signal });
        for (const [flow, stage] of [
            ["page:mounted", "publish"],
            ["page:ready", "afterReady"],
            ["authenticate-session", "afterSession"],
        ]) {
            if (!ctx.flowExists(flow)) continue;
            const id = "ui:tutorial:page";
            ctx.extendFlow(flow, stage, { id, order: 10000 }, () => {
                if (flow !== "authenticate-session") navigating = false;
                if (
                    flow === "page:mounted" ||
                    flow === "authenticate-session"
                ) {
                    completionFailure = undefined;
                    completions.invalidate();
                }
                schedule();
            });
            signal.addEventListener(
                "abort",
                () => ctx.removeFlowHook(flow, stage, id),
                { once: true },
            );
        }
        schedule();
    }
    return {
        refresh,
        open,
        complete,
        connect,
        dispose: () => controller.abort(),
    };
}
