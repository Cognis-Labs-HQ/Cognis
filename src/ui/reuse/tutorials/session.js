import { abortable } from "./async.js";
import { waitForTarget } from "./targets.js";
import { validateRoute } from "./schema.js";

/** One cancellable session. Step epochs isolate late callbacks from subsequent steps. */
export function createSession({
    record,
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
    async function enter(nextIndex) {
        if (disposed || busy) return false;
        busy = true;
        cleanStep();
        index = nextIndex;
        if (index >= record.play.steps.length) {
            busy = false;
            return finish("completed", "complete");
        }
        const step = record.play.steps[index];
        const current = new AbortController();
        stepController = current;
        const signal = AbortSignal.any([controller.signal, current.signal]);
        try {
            if (!allowed()) return finish("cancelled", "permissionLost");
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
                transitioningRoute = true;
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
                if (step.missing.action === "cancel")
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
                    step.enter({ signal, target, stepId: step.id }),
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
                valid: () =>
                    allowed() &&
                    (!step.target || resolve(step.target) === target),
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
                        step.waitFor({ signal, target, stepId: step.id }),
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
        next: () => (busy ? false : enter(index + 1)),
        back: () => (busy || index <= 0 ? false : enter(index - 1)),
        retry: () => enter(index),
        cancel: (reason) => finish("cancelled", reason),
        skip: () => finish("skipped", "skip"),
        navigation: () => {
            if (!transitioningRoute) finish("cancelled", "navigation");
        },
    };
}
