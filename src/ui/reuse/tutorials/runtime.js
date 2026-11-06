/**
 * Install the version-one host tutorial contract and staged operations.
 * Owners publish semantic targets and localized plays; sessions never execute declarative strings.
 * Public export: registerTutorials — registers owner-scoped tutorials and named session flows.
 * @example const owner = ctx.capabilities.get('ui:tutorials').owner('module.example', { signal, i18n });
 * @param {object} ctx Host flow/capability context.
 * @param {object} dependencies Host presentation, navigation and document boundaries.
 * @returns {object} The shared tutorial capability.
 */
import { validateName, validatePlay } from "./schema.js";
import { resolveTarget } from "./targets.js";
import { createSession } from "./session.js";
import { abortable } from "./async.js";
import { mountPageTutorials } from "./pages.js";
import { hasMinAccessRole } from "../access-role.js";

export function registerTutorials(
    ctx,
    {
        document = globalThis.document,
        view,
        feedback = () => {},
        log = () => {},
        page,
        openPage,
        localize,
        identity = () => null,
        role = () => null,
    } = {},
) {
    if (ctx.capabilities.get("ui:tutorials"))
        return ctx.capabilities.get("ui:tutorials");
    const owners = new Map(),
        targets = new Map(),
        plays = new Map();
    let active;
    function withdrawTarget(id, record) {
        if (targets.get(id) !== record) return;
        targets.delete(id);
        if (active?.targetId() === id) active.cancel("targetRemoved");
    }
    async function translationResolver(record) {
        const i18n =
            typeof record.i18n === "function"
                ? await abortable(
                      Promise.resolve().then(record.i18n),
                      record.signal,
                  )
                : record.i18n;
        record.signal.throwIfAborted();
        if (typeof i18n?.t !== "function")
            throw new TypeError("tutorial_i18n_required");
        return i18n;
    }
    function allowed(record) {
        return (
            !record.signal.aborted &&
            (record.play.available ? record.play.available() === true : true) &&
            record.play.requires.every(
                (key) => ctx.capabilities.get(key) != null,
            )
        );
    }
    function matchesPage(record, page) {
        return typeof record.play.page === "function"
            ? record.play.page(page) === true
            : record.play.page === page.pathname;
    }
    const action = (name, execute) => {
        const id = `ui:tutorial:${name}`;
        ctx.registerFlow(id, ["validate", "execute", "after"]);
        ctx.extendFlow(id, "validate", { id }, ({ input }) => {
            ctx.signal?.throwIfAborted();
            if (input?.owner?.signal.aborted)
                throw new Error("tutorial_owner_disposed");
        });
        ctx.extendFlow(id, "execute", { id }, async ({ input, data }) => {
            if (input?.owner?.signal.aborted)
                throw new Error("tutorial_owner_disposed");
            data.result = await execute(input);
        });
        return async (input) => (await ctx.runFlow(id, input)).data.result;
    };
    const emit = (name, detail) => {
        if (
            [
                "next",
                "back",
                "skip",
                "cancel",
                "retry",
                "restart",
                "modal",
                "priority",
            ].includes(name)
        ) {
            return operations[name]({ session: active, ...detail }).catch(
                report,
            );
        } else
            document?.defaultView?.dispatchEvent(
                new document.defaultView.CustomEvent(
                    `cognis:tutorial-${name}`,
                    { detail },
                ),
            );
    };
    function notifyFailure() {
        Promise.resolve()
            .then(() => feedback("error"))
            .catch((error) => {
                log("error", "Tutorial feedback failed.", {
                    component: "ui",
                    operation: "tutorialFeedback",
                    errorName: error?.name,
                });
            });
    }
    function report(error) {
        log("error", "Tutorial operation failed.", {
            component: "ui",
            operation: "tutorial",
            errorName: error?.name,
        });
        notifyFailure();
    }
    const operations = {};
    operations.register = action("register", async ({ owner, input }) => {
        const play = validatePlay(input);
        const id = `${owner.id}:${play.id}`;
        if (plays.has(id)) throw new Error("tutorial_play_conflict");
        // Resolve all owner text before publishing; genuine missing translations fail explicitly.
        const i18n = await translationResolver(owner);
        i18n.t(play.titleKey);
        for (const step of play.steps) {
            i18n.t(step.titleKey);
            if (step.bodyKey) i18n.t(step.bodyKey);
        }
        if (plays.has(id)) throw new Error("tutorial_play_conflict");
        const record = {
            id,
            owner: owner.id,
            play,
            i18n: owner.i18n,
            signal: owner.signal,
        };
        plays.set(id, record);
        emit("changed");
        log("info", "Tutorial registered.", {
            component: "ui",
            operation: "registerTutorial",
            tutorialId: id,
            owner: owner.id,
        });
        const dispose = () => {
            if (plays.get(id) !== record) return;
            plays.delete(id);
            emit("changed");
            if (active?.id === id) active.cancel("playRemoved");
        };
        return {
            id,
            dispose,
            start: (options) =>
                operations.start({ ...options, id, expected: record }),
        };
    });
    operations.publishTarget = action(
        "publishTarget",
        ({ owner, name, options }) => {
            validateName(name);
            if (
                typeof options?.resolve !== "function" ||
                (options.public !== undefined &&
                    typeof options.public !== "boolean") ||
                (options.available !== undefined &&
                    typeof options.available !== "function") ||
                (options.root !== undefined &&
                    typeof options.root !== "function")
            )
                throw new TypeError("invalid_tutorial_target");
            const id = `${owner.id}:${name}`;
            if (targets.has(id)) throw new Error("tutorial_target_conflict");
            const signal = options.signal
                ? AbortSignal.any([owner.signal, options.signal])
                : owner.signal;
            signal.throwIfAborted();
            const record = { ...options, owner: owner.id, signal };
            targets.set(id, record);
            log("info", "Tutorial target published.", {
                component: "ui",
                operation: "publishTutorialTarget",
                targetId: id,
                owner: owner.id,
            });
            const dispose = () => {
                withdrawTarget(id, record);
                signal.removeEventListener("abort", dispose);
            };
            signal.addEventListener("abort", dispose, { once: true });
            return { id, dispose };
        },
    );
    operations.start = action(
        "start",
        async ({ id, replace = false, expected, firstTime = false }) => {
            if (
                typeof id !== "string" ||
                typeof replace !== "boolean" ||
                typeof firstTime !== "boolean"
            )
                throw new TypeError("invalid_tutorial_start");
            const record = plays.get(id);
            if (
                !record ||
                (expected && expected !== record) ||
                !allowed(record) ||
                !matchesPage(record, {
                    pathname: document?.defaultView?.location.pathname,
                })
            )
                throw new Error("tutorial_unavailable");
            const actor = identity();
            const i18n = await translationResolver(record);
            if (
                identity() !== actor ||
                !matchesPage(record, {
                    pathname: document?.defaultView?.location.pathname,
                }) ||
                plays.get(id) !== record ||
                !allowed(record)
            )
                throw new Error("tutorial_unavailable");
            if (active && !replace) throw new Error("tutorial_session_active");
            if (document?.querySelector?.(".popup-overlay--visible"))
                throw new Error("tutorial_modal_active");
            active?.cancel("replaced");
            const session = createSession({
                record: { ...record, i18n },
                firstTime,
                role,
                document,
                allowed: () => allowed(record) && identity() === actor,
                resolve: (target) =>
                    resolveTarget(targets, target, record.owner, document),
                view,
                navigate: ctx.capabilities.get("ui:navigate"),
                log,
                onFinish(result) {
                    if (active === session) active = undefined;
                    if (result.status === "failed") notifyFailure();
                },
                emit: (name, detail) => {
                    if (
                        name === "finish" ||
                        name === "presented" ||
                        active === session
                    )
                        return emit(name, detail);
                },
            });
            active = session;
            void session.begin();
            return Object.freeze({
                id,
                signal: session.signal,
                ready: session.ready,
                finished: session.finished,
                state: session.state,
                next: () => operations.next({ session }),
                back: () => operations.back({ session }),
                retry: () => operations.retry({ session }),
                restart: () => operations.restart({ session }),
                skip: () => operations.skip({ session }),
                cancel: () => operations.cancel({ session }),
                dispose: () => operations.dispose({ session }),
            });
        },
    );
    operations.next = action("next", ({ session, interacted = false }) =>
        active === session && session ? session.next(interacted) : false,
    );
    for (const name of [
        "back",
        "skip",
        "cancel",
        "retry",
        "restart",
        "dispose",
        "modal",
        "priority",
    ])
        operations[name] = action(name, ({ session }) =>
            active === session && session ? session[name]() : false,
        );
    operations.list = action("list", async ({ page }) => {
        const available = [];
        for (const record of plays.values()) {
            if (!allowed(record)) continue;
            if (page && !matchesPage(record, page)) continue;
            const i18n = await translationResolver(record);
            if (plays.get(record.id) === record && allowed(record))
                available.push({
                    id: record.id,
                    title: i18n.t(record.play.titleKey),
                });
        }
        return available;
    });
    let openingPage;
    const capability = {
        version: 1,
        owner(id, { signal, i18n, stringsBaseUrls = [] }) {
            ctx.signal?.throwIfAborted();
            validateName(id);
            signal.throwIfAborted();
            if (
                !Array.isArray(stringsBaseUrls) ||
                stringsBaseUrls.some(
                    (url) =>
                        typeof url !== "string" ||
                        !url.startsWith("/static/") ||
                        /[?#]|\.\./.test(url),
                )
            )
                throw new TypeError("invalid_tutorial_strings");
            const resolver =
                i18n ??
                (typeof localize === "function"
                    ? () => localize(stringsBaseUrls)
                    : undefined);
            if (
                typeof resolver !== "function" &&
                typeof resolver?.t !== "function"
            )
                throw new TypeError("tutorial_i18n_required");
            if (owners.has(id)) throw new Error("tutorial_owner_conflict");
            const controller = new AbortController();
            const combined = AbortSignal.any([signal, controller.signal]);
            const owner = { id, signal: combined, i18n: resolver };
            owners.set(id, owner);
            const dispose = () => {
                if (owners.get(id) !== owner) return;
                owners.delete(id);
                controller.abort();
                for (const [key, record] of plays)
                    if (record.owner === id) {
                        plays.delete(key);
                        emit("changed");
                        if (active?.id === key) active.cancel("ownerRemoved");
                    }
                for (const [key, record] of targets)
                    if (record.owner === id) withdrawTarget(key, record);
                log("info", "Tutorial owner disposed.", {
                    component: "ui",
                    operation: "disposeTutorialOwner",
                    owner: id,
                });
            };
            owner.dispose = dispose;
            combined.addEventListener("abort", dispose, { once: true });
            return Object.freeze({
                id,
                signal: combined,
                dispose,
                register: (input) => operations.register({ owner, input }),
                target: (name, options) =>
                    operations.publishTarget({ owner, name, options }),
            });
        },
        list: (options = {}) => operations.list(options),
        start: (id, options = {}) => operations.start({ ...options, id }),
        current: () => active?.state() ?? null,
        cancel: () => operations.cancel({ session: active }),
        mountPage: (options) => operations.mountPage({ options }),
        refreshPage: () => operations.page({}),
        openPage: () =>
            (openingPage ??= operations.openPage({}).finally(() => {
                openingPage = undefined;
            })),
    };
    operations.mountPage = action("mountPage", ({ options }) =>
        mountPageTutorials(capability, {
            ...options,
            authorized: () =>
                ctx.capabilities.get("session:isAuthenticated")?.() === true &&
                (!options.minRole || hasMinAccessRole(role(), options.minRole)),
        }),
    );
    operations.page = action("page", () => page?.());
    operations.openPage = action("openPage", () => openPage?.());
    ctx.capabilities.contribute("ui:tutorials", Object.freeze(capability));
    document?.defaultView?.addEventListener(
        "cognis:route-will-change",
        () => active?.navigation(),
        { signal: ctx.signal },
    );
    document?.defaultView?.addEventListener(
        "cognis:route-before-navigate",
        (event) => {
            if (!active?.blocksNavigation(event.detail?.path)) return;
            event.preventDefault();
            log("info", "Tutorial blocked page navigation.", {
                operation: "guardNavigation",
                tutorialId: active.id,
            });
        },
        { signal: ctx.signal },
    );
    document?.defaultView?.addEventListener(
        "popstate",
        () => {
            if (!active?.blocksNavigation()) active?.cancel("history");
        },
        { signal: ctx.signal },
    );
    document?.defaultView?.addEventListener(
        "keydown",
        (event) => {
            if (!active || event.key !== "Escape") return;
            if (document.querySelector(".popup-overlay--visible")) {
                active.cancel("modal");
                return;
            }
            if (event.target?.closest?.("#site-top-banners")) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            if (!active.state().firstTime) active.cancel("escape");
        },
        { capture: true, signal: ctx.signal },
    );
    ctx.signal?.addEventListener(
        "abort",
        () => {
            active?.cancel("hostDisposed");
            for (const owner of [...owners.values()]) owner.dispose();
        },
        { once: true },
    );
    return capability;
}
