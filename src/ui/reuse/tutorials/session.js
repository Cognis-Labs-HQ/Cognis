/**
 * Runs cancellable tutorial steps with isolated lifetimes for late callbacks.
 * Public export: createSession — creates one session and its step operations.
 * @example const session = createSession(dependencies); await session.begin();
 * @param {object} dependencies Registration, presentation, navigation and lifecycle boundaries.
 * @returns {object} Session state, completion promises and step operations.
 */
import { abortable } from "./async.js";
import { waitForTarget } from "./targets.js";
import { validateRoute } from "./schema.js";

export function createSession({
    record,
    firstTime = false,
    resolve,
    view,
    navigate,
    document,
    allowed,
    log,
    onFinish,
    emit,
}) {
    const controller = new AbortController();
    let groupController = new AbortController();
    let groupId, groupStart;
    const originalFocus = document?.activeElement;
    let index = -1,
        stepController,
        rendering,
        leave,
        busy = false,
        disposed = false;
    let settle, ready;
    const finished = new Promise((resolve) => {
        settle = resolve;
    });
    const prepared = new Promise((resolve) => {
        ready = resolve;
    });
    const status = () => ({
        id: record.id,
        firstTime,
        stepId: record.play.steps[index]?.id ?? null,
        index,
        total: record.play.steps.length,
    });
    function cleanStep() {
        stepController?.abort();
        stepController = null;
        rendering?.dispose();
        rendering = null;
        if (leave) {
            const dispose = leave;
            leave = null;
            const failed = (error) =>
                log("error", "Tutorial step cleanup failed.", {
                    operation: "disposeStep",
                    errorName: error?.name,
                });
            try {
                Promise.resolve(dispose()).catch(failed);
            } catch (error) {
                failed(error);
            }
        }
    }
    function finish(outcome = "cancelled", reason = "cancel") {
        if (disposed) return false;
        disposed = true;
        controller.abort();
        groupController.abort();
        cleanStep();
        record.signal.removeEventListener("abort", ownerRemoved);
        const result = { ...status(), status: outcome, reason };
        onFinish(result);
        settle(result);
        ready(false);
        emit("finish", result);
        log(
            outcome === "failed" ? "error" : "info",
            "Tutorial session finished.",
            {
                operation: "finish",
                tutorialId: record.id,
                status: outcome,
                reason,
            },
        );
        if (!document?.querySelector?.(".popup-overlay--visible")) {
            const fallback = document?.querySelector?.("main, .main-window");
            if (originalFocus?.isConnected)
                originalFocus.focus?.({ preventScroll: true });
            else fallback?.focus?.({ preventScroll: true });
        }
        return true;
    }
    const ownerRemoved = () => finish("cancelled", "ownerRemoved");
    record.signal.addEventListener("abort", ownerRemoved, { once: true });
    async function present(options) {
        const pending = Promise.resolve().then(() => view(options));
        pending
            .then((rendered) => {
                if (options.signal.aborted) return rendered?.dispose();
            })
            .catch((error) => {
                if (options.signal.aborted)
                    log("error", "Cancelled tutorial presentation failed.", {
                        operation: "latePresentation",
                        errorName: error?.name,
                    });
            });
        const rendered = await abortable(pending, options.signal);
        if (options.signal.aborted) {
            rendered?.dispose();
            options.signal.throwIfAborted();
        }
        return rendered;
    }
    async function enter(nextIndex, interrupt = false) {
        if (disposed || (busy && !interrupt)) return false;
        busy = true;
        cleanStep();
        const previousIndex = index;
        index = nextIndex;
        const step = record.play.steps[index];
        if (
            !step?.group ||
            step.group !== groupId ||
            (index === groupStart && index < previousIndex)
        ) {
            groupController.abort();
            groupController = new AbortController();
            groupId = step?.group;
            groupStart = index;
        }
        const groupSignal = groupController.signal;
        const current = new AbortController();
        stepController = current;
        const signal = AbortSignal.any([controller.signal, current.signal]);
        try {
            if (!allowed()) return finish("cancelled", "permissionLost");
            if (index >= record.play.steps.length) {
                busy = false;
                return finish("completed", "complete");
            }
            const text = {
                title: record.i18n.t(step.titleKey),
                body: step.bodyKey ? record.i18n.t(step.bodyKey) : "",
            };
            const actions = {
                next: () => emit("next"),
                back: () => emit("back"),
                cancel: () => emit("cancel"),
                skip: () => emit("skip"),
                retry: () => emit("retry"),
                modal: () => emit("modal"),
            };
            rendering = await present({
                step,
                text,
                ...status(),
                waiting: true,
                target: null,
                signal,
                actions,
                valid: allowed,
                lost: (error) =>
                    error ? fail(error) : finish("cancelled", "permissionLost"),
            });
            const route =
                typeof step.route === "function"
                    ? validateRoute(
                          await abortable(
                              Promise.resolve().then(() =>
                                  step.route({ signal }),
                              ),
                              signal,
                          ),
                      )
                    : step.route;
            if (route && document?.defaultView?.location.pathname !== route) {
                if (!navigate)
                    throw new Error("tutorial_navigation_unavailable");
                transitioningRoute = route;
                let moved;
                try {
                    moved = await abortable(navigate(route), signal);
                } finally {
                    transitioningRoute = false;
                }
                if (!moved) return finish("cancelled", "navigationDenied");
            }
            signal.throwIfAborted();
            const target = step.target
                ? await waitForTarget(
                      () => {
                          if (!allowed())
                              throw new Error("tutorial_permission_lost");
                          return resolve(step.target);
                      },
                      { signal, timeoutMs: step.missing.timeoutMs, document },
                  )
                : null;
            signal.throwIfAborted();
            if (step.target && !target) {
                rendering?.dispose();
                rendering = null;
                if (step.missing.action === "skip") {
                    busy = false;
                    return enter(index + 1);
                }
                if (!firstTime && step.missing.action === "cancel")
                    return finish("cancelled", "missingTarget");
                rendering = await present({
                    step,
                    text,
                    ...status(),
                    waiting: true,
                    missing: true,
                    target: null,
                    signal,
                    actions,
                    valid: allowed,
                    lost: (error) =>
                        error
                            ? fail(error)
                            : finish("cancelled", "permissionLost"),
                });
                busy = false;
                ready(true);
                return true;
            }
            if (
                step.interaction === "target" &&
                (target?.matches?.("iframe, object, embed") ||
                    target?.querySelector?.("iframe, object, embed"))
            )
                throw new Error("tutorial_embedded_lock_unsupported");
            if (step.enter) {
                const work = Promise.resolve().then(() =>
                    step.enter({
                        signal,
                        sessionSignal: controller.signal,
                        groupSignal,
                        target,
                        stepId: step.id,
                    }),
                );
                work.then((cleanup) => {
                    if (signal.aborted && typeof cleanup === "function")
                        return cleanup();
                }).catch((error) => {
                    if (signal.aborted)
                        log("error", "Cancelled tutorial callback failed.", {
                            operation: "lateCallback",
                            errorName: error?.name,
                        });
                });
                leave = await abortable(work, signal);
                if (leave !== undefined && typeof leave !== "function")
                    throw new TypeError("invalid_tutorial_cleanup");
            }
            signal.throwIfAborted();
            rendering?.dispose();
            rendering = null;
            let interactionPending = false;
            rendering = await present({
                step,
                text,
                ...status(),
                target,
                signal,
                actions,
                valid: (interacting = false) =>
                    allowed() &&
                    (interacting ||
                        !step.target ||
                        resolve(step.target) === target),
                lost: (error) => {
                    if (error) fail(error);
                    else if (!busy && !disposed) void enter(index);
                },
                interacted: async (event) => {
                    if (
                        busy ||
                        interactionPending ||
                        signal.aborted ||
                        !allowed() ||
                        !step.advance ||
                        (step.advance.key && event.key !== step.advance.key)
                    )
                        return;
                    interactionPending = true;
                    try {
                        if (
                            step.advance.accept &&
                            (await abortable(
                                Promise.resolve().then(() =>
                                    step.advance.accept(event),
                                ),
                                signal,
                            )) !== true
                        )
                            return;
                        if (!signal.aborted && !busy && allowed()) emit("next");
                    } catch (error) {
                        if (!signal.aborted) fail(error);
                    } finally {
                        interactionPending = false;
                    }
                },
            });
            signal.throwIfAborted();
            busy = false;
            ready(true);
            emit("presented", status());
            log("info", "Tutorial step presented.", {
                operation: "presentStep",
                tutorialId: record.id,
                stepId: step.id,
            });
            if (step.waitFor) {
                void abortable(
                    Promise.resolve().then(() =>
                        step.waitFor({
                            signal,
                            sessionSignal: controller.signal,
                            groupSignal,
                            target,
                            stepId: step.id,
                        }),
                    ),
                    signal,
                )
                    .then(() => {
                        if (!signal.aborted && !busy) emit("next");
                    })
                    .catch((error) => {
                        if (!signal.aborted) fail(error);
                    });
            }
            return true;
        } catch (error) {
            if (!signal.aborted) fail(error);
            return false;
        } finally {
            if (stepController === current) busy = false;
        }
    }
    function fail(error) {
        log("error", "Tutorial action failed.", {
            operation: "runStep",
            tutorialId: record.id,
            errorName: error?.name,
        });
        finish(
            "failed",
            error?.message === "tutorial_callback_timeout"
                ? "timeout"
                : "callbackError",
        );
    }
    let transitioningRoute = false;
    return {
        id: record.id,
        signal: controller.signal,
        ready: prepared,
        finished,
        state: status,
        targetId: () => record.play.steps[index]?.target,
        begin: () => enter(0),
        next: () => enter(index + 1, firstTime),
        back: () => (busy || index <= 0 ? false : enter(index - 1)),
        retry: () => enter(index),
        cancel: (reason) =>
            firstTime && !reason ? false : finish("cancelled", reason),
        skip: () => (firstTime ? false : finish("skipped", "skip")),
        dispose: () => finish("cancelled", "disposed"),
        modal: () => finish("cancelled", "modal"),
        blocksNavigation: (path) =>
            !(transitioningRoute && path === transitioningRoute) &&
            !disposed &&
            record.play.steps[index]?.preventNavigation === true,
        navigation: () => {
            if (!transitioningRoute) finish("cancelled", "navigation");
        },
    };
}
