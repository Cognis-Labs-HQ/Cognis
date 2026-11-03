/**
 * Coordinates page discovery, account-scoped completion and header replay controls.
 * Public export: createPageTutorials — creates a lifecycle-owned page coordinator.
 * @example const page = createPageTutorials(dependencies); page.connect();
 * @param {object} dependencies Public ctx, tutorial, document, storage and localization boundaries.
 * @returns {{refresh: Function, open: Function, connect: Function, dispose: Function}} Page operations.
 */
import { createFloatingMenu } from "../floating-menu.js";

export function createPageTutorials({
    ctx,
    api,
    document,
    account,
    storage,
    localize,
    prepareStyles,
    report,
}) {
    const window = document.defaultView;
    const controller = new AbortController();
    const signal = ctx.signal
        ? AbortSignal.any([ctx.signal, controller.signal])
        : controller.signal;
    const completed = new Set();
    const attempted = new Set();
    const storageFailures = new Set();
    let help,
        menu,
        pending,
        queued = false,
        navigating = false;
    let epoch = 0;
    const location = () => ({ pathname: window.location.pathname });
    const key = (actor, id) =>
        `cognis_tutorial:${encodeURIComponent(actor)}:${id}`;
    function seen(actor, id) {
        const name = key(actor, id);
        if (completed.has(name)) return true;
        let persisted;
        try {
            persisted = storage()?.getItem(name);
        } catch (error) {
            if (!storageFailures.has(actor)) {
                storageFailures.add(actor);
                report(error);
            }
        }
        if (persisted === "completed") {
            completed.add(name);
            return true;
        }
        return false;
    }
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
        const header = document.querySelector(".page-context h1");
        const plays = await api.list({ page });
        if (
            signal.aborted ||
            revision !== epoch ||
            !header?.isConnected ||
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
            account() !== actor
        )
            return;
        if (!help?.isConnected || help.parentElement !== header) {
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
            header.append(help);
        }
        help.setAttribute("aria-label", i18n.t("ui.tutorial.replay"));
        help.setAttribute("title", i18n.t("ui.tutorial.replay"));
        help.disabled = Boolean(api.current());
        if (
            !actor ||
            api.current() ||
            document.querySelector(".popup-overlay--visible")
        )
            return;
        const first = plays.find(
            (play) =>
                !attempted.has(key(actor, play.id)) && !seen(actor, play.id),
        );
        if (!first) return;
        return start(first.id, actor);
    }
    async function start(id, actor) {
        if (signal.aborted || account() !== actor) return false;
        const firstTime = Boolean(actor && !seen(actor, id));
        attempted.add(key(actor, id));
        const session = await api.start(id, { firstTime });
        void session.finished
            .then((result) => {
                if (result.status === "completed" && actor) {
                    const name = key(actor, id);
                    completed.add(name);
                    try {
                        storage()?.setItem(name, "completed");
                    } catch (error) {
                        report(error);
                    }
                }
                schedule();
            })
            .catch(report);
        return session;
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
        menu.element.querySelector("button")?.focus();
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
            attributeFilter: ["class"],
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
                attempted.clear();
                menu?.dispose();
                schedule();
            },
            { signal },
        );
        window.addEventListener("storage", schedule, { signal });
        for (const [flow, stage] of [
            ["page:mounted", "publish"],
            ["authenticate-session", "afterSession"],
        ]) {
            if (!ctx.flowExists(flow)) continue;
            const id = "ui:tutorial:page";
            ctx.extendFlow(flow, stage, { id, order: 10000 }, () => {
                if (flow !== "authenticate-session") navigating = false;
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
    return { refresh, open, connect, dispose: () => controller.abort() };
}
