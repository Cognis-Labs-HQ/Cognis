/**
 * Coordinates explicit, lifetime-bound focus delegation for shared popups.
 * Public export: popupFocusOwnership resolves the shared ui:popupFocus capability.
 * @example const ownership = popupFocusOwnership(ctx); ownership.delegate(overlay, options);
 */

/**
 * @param {object} ctx Shared browser capability context.
 * @returns {object} Popup registration and scoped focus delegation capability.
 */
export function popupFocusOwnership(ctx) {
    const existing = ctx.capabilities.get("ui:popupFocus");
    if (existing) return existing;
    const owners = new WeakMap();

    function log(level, message, metadata) {
        try {
            const logger = ctx.capabilities.get("ui:log");
            if (logger) logger(level, message, metadata);
            else console[level](message, metadata);
        } catch (error) {
            console.error("Popup focus logging failed.", {
                component: "ui",
                operation: "logPopupFocus",
                errorName: error?.name,
            });
        }
    }

    function requireSynchronous(result, operation) {
        if (result && typeof result.then === "function") {
            Promise.resolve(result).catch((error) =>
                log("error", "Asynchronous popup focus callback rejected.", {
                    component: "ui",
                    operation,
                    errorName: error?.name,
                }),
            );
            throw new TypeError("popup_focus_callback_must_be_synchronous");
        }
    }

    const capability = {
        register(overlay, handlers) {
            if (owners.has(overlay))
                throw new Error("popup_focus_owner_exists");
            let delegation;
            let released = false;
            let checking = false;
            let focusing = false;

            function fail(current, error, operation) {
                log("error", "Popup focus delegation failed.", {
                    component: "ui",
                    operation,
                    errorName: error?.name,
                });
                current.release();
            }

            const owner = {
                contains(element) {
                    const current = delegation;
                    if (!current) return handlers.contains(element);
                    if (checking) {
                        fail(
                            current,
                            new Error("popup_focus_contains_reentrant"),
                            "containsPopupFocus",
                        );
                        return handlers.contains(element);
                    }
                    checking = true;
                    try {
                        const allowed = current.contains(element);
                        requireSynchronous(allowed, "containsPopupFocus");
                        if (typeof allowed !== "boolean")
                            throw new TypeError(
                                "popup_focus_predicate_must_be_boolean",
                            );
                        return delegation === current
                            ? allowed
                            : handlers.contains(element);
                    } catch (error) {
                        fail(current, error, "containsPopupFocus");
                        return handlers.contains(element);
                    } finally {
                        checking = false;
                    }
                },
                focus(preferred) {
                    if (released || !handlers.active()) return;
                    const current = delegation;
                    if (!current) return handlers.focus(preferred);
                    if (focusing) {
                        fail(
                            current,
                            new Error("popup_focus_reentrant"),
                            "restorePopupFocus",
                        );
                        return;
                    }
                    focusing = true;
                    try {
                        if (
                            preferred?.isConnected &&
                            owner.contains(preferred)
                        ) {
                            if (delegation === current)
                                preferred.focus({ preventScroll: true });
                        } else if (delegation === current)
                            requireSynchronous(
                                current.focus(),
                                "restorePopupFocus",
                            );
                        if (
                            delegation === current &&
                            !owner.contains(overlay.ownerDocument.activeElement)
                        )
                            fail(
                                current,
                                new Error("popup_focus_outside_scope"),
                                "restorePopupFocus",
                            );
                    } catch (error) {
                        fail(current, error, "restorePopupFocus");
                    } finally {
                        focusing = false;
                    }
                },
                get delegated() {
                    return Boolean(delegation);
                },
                delegate({ signal, surfaces, contains, focus, onRevoke }) {
                    if (
                        !signal ||
                        !Array.isArray(surfaces) ||
                        !surfaces.length ||
                        surfaces.some(
                            (surface) =>
                                !surface?.isConnected ||
                                surface.ownerDocument !== overlay.ownerDocument,
                        ) ||
                        typeof contains !== "function" ||
                        typeof focus !== "function" ||
                        typeof onRevoke !== "function"
                    )
                        throw new TypeError("popup_focus_delegation_invalid");
                    signal.throwIfAborted();
                    if (
                        released ||
                        !handlers.active() ||
                        !overlay.isConnected ||
                        !overlay.hasAttribute("data-popup-active")
                    )
                        throw new Error("popup_focus_owner_unavailable");
                    if (delegation)
                        throw new Error("popup_focus_delegation_exists");
                    const current = { contains, focus };
                    function release() {
                        observer.disconnect();
                        signal.removeEventListener("abort", release);
                        if (delegation !== current) return;
                        delegation = undefined;
                        try {
                            requireSynchronous(onRevoke(), "revokePopupFocus");
                        } catch (error) {
                            log("error", "Popup focus revocation failed.", {
                                component: "ui",
                                operation: "revokePopupFocus",
                                errorName: error?.name,
                            });
                        }
                        log("info", "Popup focus delegation released.", {
                            component: "ui",
                            operation: "releasePopupFocus",
                        });
                        handlers.focus();
                    }
                    const observer =
                        new overlay.ownerDocument.defaultView.MutationObserver(
                            () => {
                                if (
                                    surfaces.some(
                                        (surface) => !surface.isConnected,
                                    )
                                )
                                    release();
                            },
                        );
                    observer.observe(overlay.ownerDocument.body, {
                        childList: true,
                        subtree: true,
                    });
                    current.release = release;
                    delegation = current;
                    log("info", "Popup focus delegated.", {
                        component: "ui",
                        operation: "delegatePopupFocus",
                    });
                    signal.addEventListener("abort", release, { once: true });
                    return release;
                },
                release() {
                    if (released) return;
                    released = true;
                    owners.delete(overlay);
                    delegation?.release();
                },
            };
            owners.set(overlay, owner);
            return owner;
        },
        delegate(overlay, options) {
            const owner = owners.get(overlay);
            if (!owner) throw new Error("popup_focus_owner_unavailable");
            return owner.delegate(options);
        },
        restore(overlay, preferred) {
            const owner = owners.get(overlay);
            if (!owner) return false;
            owner.focus(preferred);
            return true;
        },
    };
    ctx.capabilities.contribute("ui:popupFocus", Object.freeze(capability));
    return capability;
}
