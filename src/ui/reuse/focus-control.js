/**
 * Coordinates provider-neutral Focus Control sessions in the dashboard shell.
 *
 * Public exports:
 * - `createFocusControlCoordinator` — creates one manifest-driven coordinator.
 * - `normalizeFocusManifest` — validates and flattens page and element surfaces.
 *
 * @example
 * const focus = createFocusControlCoordinator({ root, manifest, elements, i18n, signal });
 * await focus.mount();
 *
 * @param {object} input - Composer-owned Focus Control dependencies.
 * @returns {object} A coordinator with mount, receive, follow, dismiss, and destroy methods.
 */
import { uiCtx } from "./ui-ctx.js";
import { pageActions } from "./page-actions.js";

const sessionsByRoot = new WeakMap();
const SAFE_ID = /^[a-z0-9][a-z0-9._:-]{0,127}$/;

function text(i18n, key, fallback) {
    return i18n?.t?.(key) ?? i18n?.get?.(key) ?? fallback;
}

function serializable(value) {
    const pending = [value];
    const seen = new Set();
    while (pending.length) {
        const current = pending.pop();
        if (
            typeof current === "function" ||
            typeof current === "symbol" ||
            typeof current === "undefined"
        )
            return false;
        if (current && typeof current === "object") {
            if (seen.has(current)) return false;
            seen.add(current);
            pending.push(...Object.values(current));
        }
    }
    let encoded;
    try {
        encoded = JSON.stringify(value ?? null);
    } catch {
        return false;
    }
    return (
        encoded !== undefined &&
        encoded.length <= 65_536 &&
        !/<\/?[a-z][\s\S]*>/i.test(encoded)
    );
}

export function normalizeFocusManifest(manifest, elements = []) {
    const declarations = [
        manifest?.focusControl,
        ...elements.map((element) => element.focusControl),
    ].filter(Boolean);
    return declarations
        .flatMap((entry) => entry.surfaces ?? [entry])
        .filter(
            (surface) =>
                SAFE_ID.test(surface?.id ?? "") &&
                SAFE_ID.test(surface?.pageId ?? "") &&
                ["route", "module-route"].includes(surface?.loader?.kind) &&
                SAFE_ID.test(surface?.loader?.routeId ?? "") &&
                surface?.labelKey &&
                surface?.descriptionKey &&
                Array.isArray(surface?.modes) &&
                surface.modes.length > 0 &&
                surface.modes.every((mode) =>
                    ["overlay", "fullscreen", "pip"].includes(mode),
                ) &&
                serializable(surface.initialState),
        );
}

export function createFocusControlCoordinator({
    root,
    manifest,
    elements = [],
    i18n,
    signal,
}) {
    const surfaces = normalizeFocusManifest(manifest, elements);
    const transport = uiCtx.capabilities.get("focus:transport");
    const routeResolver = uiCtx.capabilities.get("router:resolveDeclaredRoute");
    let active = null;
    let following = true;
    let overlay = null;
    let restore = null;
    const removers = [];

    function makeMovable(panel, handle) {
        let origin = null;
        handle.addEventListener(
            "pointerdown",
            (event) => {
                origin = {
                    x: event.clientX,
                    y: event.clientY,
                    left: panel.getBoundingClientRect().left,
                    top: panel.getBoundingClientRect().top,
                };
                handle.setPointerCapture(event.pointerId);
            },
            { signal },
        );
        handle.addEventListener(
            "pointermove",
            (event) => {
                if (!origin) return;
                panel.style.left = `${Math.max(0, origin.left + event.clientX - origin.x)}px`;
                panel.style.top = `${Math.max(0, origin.top + event.clientY - origin.y)}px`;
                panel.style.right = "auto";
                panel.style.bottom = "auto";
            },
            { signal },
        );
        handle.addEventListener("pointerup", () => (origin = null), { signal });
    }

    function announce(message) {
        overlay
            ?.querySelector("[data-focus-status]")
            ?.replaceChildren(document.createTextNode(message));
    }

    async function dismiss({ remote = false } = {}) {
        if (!active) return;
        await uiCtx.runFlow("end-focus", { session: active, remote });
        overlay?.remove();
        overlay = null;
        sessionsByRoot.delete(root);
        const snapshot = restore;
        active = null;
        window.scrollTo(snapshot?.x ?? 0, snapshot?.y ?? 0);
        snapshot?.focus?.focus?.();
    }

    async function load(session) {
        if (sessionsByRoot.has(root))
            throw new Error("focus_session_already_active");
        const surface = surfaces.find(
            (candidate) => candidate.id === session.surface?.id,
        );
        if (!surface) throw new Error("focus_surface_unavailable");
        const route = await routeResolver?.({
            ...surface.loader,
            requestedMode: session.mode,
        });
        if (!route?.load || signal?.aborted)
            throw new Error("focus_route_unavailable");
        restore = {
            x: window.scrollX,
            y: window.scrollY,
            focus: document.activeElement,
        };
        overlay = document.createElement("section");
        overlay.className = `focus-control-overlay focus-control-${session.mode ?? "overlay"}`;
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute(
            "aria-label",
            text(i18n, surface.labelKey, surface.id),
        );
        overlay.innerHTML = `<div class="focus-control-controls">
            <button type="button" class="btn-neutral" data-focus-follow aria-pressed="true">${text(i18n, "focus.control.follow", "Follow presenter")}</button>
            <button type="button" class="btn-cancel" data-focus-dismiss aria-label="${text(i18n, "focus.control.dismiss", "Close focused content")}">×</button>
        </div><div class="focus-control-status" role="status" aria-live="polite" data-focus-status></div><div class="focus-control-target" data-focus-target></div>`;
        root.append(overlay);
        overlay
            .querySelector("[data-focus-dismiss]")
            ?.addEventListener("click", () => dismiss(), { signal });
        overlay.querySelector("[data-focus-follow]")?.addEventListener(
            "click",
            (event) => {
                following = !following;
                event.currentTarget.setAttribute(
                    "aria-pressed",
                    String(following),
                );
            },
            { signal },
        );
        if (session.mode === "pip") {
            makeMovable(
                overlay,
                overlay.querySelector(".focus-control-controls"),
            );
        }
        for (const alternative of surfaces.filter(
            (candidate) => candidate.id !== surface.id,
        )) {
            const switchButton = document.createElement("button");
            switchButton.type = "button";
            switchButton.className = "btn-confirm";
            switchButton.textContent = text(
                i18n,
                alternative.labelKey,
                alternative.id,
            );
            switchButton.addEventListener(
                "click",
                async () => {
                    await dismiss();
                    await start(alternative);
                },
                { signal },
            );
            overlay
                .querySelector(".focus-control-controls")
                ?.prepend(switchButton);
        }
        active = session;
        sessionsByRoot.set(root, session);
        try {
            await uiCtx.runFlow("load-focus-target", {
                session,
                surface,
                route,
                root: overlay.querySelector("[data-focus-target]"),
                signal,
            });
            const module = await route.load({ signal });
            await module?.mount?.(
                overlay.querySelector("[data-focus-target]"),
                { signal, focusState: session.state },
            );
            overlay.focus();
            announce(
                text(i18n, "focus.control.started", "Focused content started"),
            );
        } catch (error) {
            await dismiss();
            throw error;
        }
    }

    async function start(surface) {
        const result = await uiCtx.runFlow("start-focus", {
            surface,
            state: surface.initialState ?? null,
        });
        const session = result.data.session;
        if (!session) throw new Error("focus_provider_did_not_create_session");
        await load(session);
    }

    async function receive(session) {
        if (
            !session ||
            !Number.isSafeInteger(session.revision) ||
            !serializable(session.state)
        )
            return false;
        if (active?.id === session.id && session.revision <= active.revision)
            return false;
        if (!following) return false;
        if (!active) await load(session);
        else if (active.id !== session.id) return false;
        active = session;
        await uiCtx.runFlow("apply-focus-state", { session, signal });
        return true;
    }

    async function mount() {
        if (
            !transport ||
            !routeResolver ||
            surfaces.length === 0 ||
            signal?.aborted
        )
            return;
        root.addEventListener(
            "click",
            (event) => {
                const trigger = event.target.closest?.("[data-focus-surface]");
                const surface = surfaces.find(
                    (candidate) =>
                        candidate.id === trigger?.dataset.focusSurface,
                );
                if (surface) void start(surface);
            },
            { signal },
        );
        for (const surface of surfaces) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "btn-confirm";
            button.textContent = text(i18n, surface.labelKey, surface.id);
            button.setAttribute(
                "aria-describedby",
                `focus-description-${surface.id}`,
            );
            button.addEventListener("click", () => start(surface), { signal });
            removers.push(
                pageActions.add({
                    id: `focus:start:${surface.id}`,
                    element: button,
                    order: 70,
                }),
            );
        }
        const unsubscribe = await transport.subscribe?.(receive, { signal });
        if (typeof unsubscribe === "function") removers.push(unsubscribe);
    }

    function destroy() {
        removers.splice(0).forEach((remove) => remove());
        if (active) void dismiss();
    }
    signal?.addEventListener("abort", destroy, { once: true });
    return {
        mount,
        receive,
        dismiss,
        destroy,
        start,
        follow(value = true) {
            following = Boolean(value);
        },
        getSession: () => active,
    };
}
