/**
 * Own component power controls, their decisions and request outcomes.
 * Public export: createToggleBindings creates replaceable control bindings.
 * @example const controls = createToggleBindings(options); controls.bind(input, key, change);
 * @param {object} options Page lifetime, popup and feedback contracts.
 * @returns {{bind: Function, clear: Function}} Control binding and teardown operations.
 */
import { createAdministrationActionFlows } from "../action-flows.js";

export function createToggleBindings({
    root,
    ctx,
    signal,
    openPopup,
    getI18n,
    showToast,
    log,
    isCurrent = () => !signal?.aborted,
}) {
    const actions = createAdministrationActionFlows({ ctx, signal });
    const bindings = new Map();
    const operations = new Map();
    function clear() {
        for (const binding of bindings.values()) binding.controller.abort();
        bindings.clear();
    }
    signal?.addEventListener("abort", clear, { once: true });

    function bind(toggle, key, callback, rejection = {}) {
        bindings.get(key)?.controller.abort();
        const controller = new AbortController();
        const binding = { toggle, controller, protected: toggle.disabled };
        bindings.set(key, binding);
        if (signal?.aborted || !isCurrent()) controller.abort();
        if (operations.has(key)) toggle.disabled = true;
        toggle.addEventListener(
            "change",
            async () => {
                const previous = operations.get(key);
                if (previous) {
                    toggle.checked = previous.checked;
                    return;
                }
                if (
                    binding.protected ||
                    controller.signal.aborted ||
                    !isCurrent() ||
                    !root.contains(toggle)
                )
                    return;
                const operation = {
                    checked: toggle.checked,
                    accepted: false,
                    uncertain: false,
                };
                operations.set(key, operation);
                toggle.disabled = true;
                const check = () => {
                    if (!isCurrent() || !root.contains(toggle))
                        controller.abort();
                    controller.signal.throwIfAborted();
                };
                const call = (action, ...args) =>
                    actions.run("read", {
                        check,
                        performOperation: () =>
                            action(...args, {
                                signal: controller.signal,
                                isCurrent,
                                requireSuccess: true,
                            }),
                    });
                const mutate = (action, ...args) =>
                    actions.run("mutation", {
                        check,
                        submit: () => {
                            operation.uncertain = true;
                            log?.("info", "component_toggle_submitted", {
                                component: "administration",
                                control: key,
                            });
                            return action(...args, {
                                signal: controller.signal,
                            });
                        },
                        acknowledge: (response) => {
                            if (!response.ok) {
                                operation.rejected = true;
                                operation.uncertain =
                                    response.status >= 500 ||
                                    response.status === 408;
                                throw new Error("component_toggle_rejected");
                            }
                            operation.accepted = true;
                            operation.uncertain = false;
                            log?.("info", "component_toggle_accepted", {
                                component: "administration",
                                control: key,
                            });
                        },
                    });
                let completed = false;
                try {
                    await callback({
                        signal: controller.signal,
                        check,
                        call,
                        mutate,
                        confirm: ({
                            label,
                            destructive,
                            cancelId = "cancel",
                            ...options
                        }) =>
                            actions.run("decision", {
                                check,
                                performOperation: () =>
                                    openPopup({
                                        ...options,
                                        signal: controller.signal,
                                        closeButtonVariant: "neutral",
                                        actions: [
                                            {
                                                id: cancelId,
                                                label: getI18n().t(
                                                    "ui.reuse.cancel",
                                                ),
                                                variant: "neutral",
                                            },
                                            {
                                                id: "confirm",
                                                label,
                                                variant: destructive
                                                    ? "cancel"
                                                    : "confirm",
                                            },
                                        ],
                                    }),
                            }),
                    });
                    completed = true;
                } catch (error) {
                    if (error?.code === "missing_translation") throw error;
                    if (
                        !controller.signal.aborted &&
                        isCurrent() &&
                        root.contains(toggle)
                    ) {
                        if (!operation.accepted && !operation.uncertain)
                            toggle.checked = !operation.checked;
                        log?.("error", "component_toggle_failed", {
                            component: "administration",
                            control: key,
                            accepted: operation.accepted,
                            uncertain: operation.uncertain,
                        });
                        showToast(
                            getI18n().t(
                                operation.uncertain
                                    ? "ui.app.admin.toggle_uncertain"
                                    : operation.accepted
                                      ? "ui.app.admin.toggle_incomplete"
                                      : operation.rejected
                                        ? (rejection.key ??
                                          "ui.reuse.save_failed")
                                        : "ui.reuse.save_failed",
                            ),
                            {
                                variant:
                                    operation.rejected &&
                                    !operation.accepted &&
                                    !operation.uncertain
                                        ? (rejection.variant ?? "error")
                                        : "error",
                            },
                        );
                    }
                } finally {
                    const retained =
                        !completed &&
                        (operation.accepted || operation.uncertain);
                    if (!retained) operations.delete(key);
                    const current = bindings.get(key);
                    if (
                        current &&
                        !current.controller.signal.aborted &&
                        isCurrent()
                    ) {
                        current.toggle.disabled = retained || current.protected;
                        const document = current.toggle.ownerDocument;
                        if (
                            !current.toggle.disabled &&
                            document &&
                            document.activeElement === document.body &&
                            !document.querySelector(
                                ".popup-overlay[data-popup-active]",
                            )
                        )
                            current.toggle.focus({ preventScroll: true });
                    }
                }
            },
            { signal: controller.signal },
        );
    }
    return {
        bind,
        clear,
        actions,
        dispose: () => {
            clear();
            actions.dispose();
        },
    };
}
