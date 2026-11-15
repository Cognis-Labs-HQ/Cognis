import {
    receiptHeading,
    renderReaders,
    requireReceiptRenderer,
} from "./receipt-avatars.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { createAnchoredPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { captureAccountGuard } from "/static/reuse/offline-identity.js";

const capabilityName = "social:messageReceipts";
const flowName = "messages:openReadReceipts";

export function mountProvider(ctx) {
    const panels = new Map();
    ctx.registerFlow(flowName, ["validate", "present"]);
    ctx.extendFlow(
        flowName,
        "validate",
        { id: "messages:receiptOwner" },
        ({ input, data }) => {
            data.current =
                panels.get(input.panel)?.current(input.attempt) === true;
        },
    );
    ctx.extendFlow(
        flowName,
        "present",
        { id: "messages:receiptPanel" },
        ({ input, data }) => {
            if (data.current) panels.get(input.panel)?.present(input.attempt);
        },
    );
    ctx.capabilities.contribute(capabilityName, {
        bind(options) {
            ctx.signal.throwIfAborted();
            for (const api of panels.keys())
                if (api.root === options.root) api.dispose();
            const panel = createReceiptPanel(ctx, options, () =>
                panels.delete(panel.api),
            );
            panels.set(panel.api, panel);
            return panel.api;
        },
    });
    ctx.signal.addEventListener(
        "abort",
        () => {
            for (const api of panels.keys()) api.dispose();
        },
        { once: true },
    );
}

export function bindReadReceiptPanel(options) {
    const provider = uiCtx.capabilities.get(capabilityName);
    if (!provider) throw new Error("message_receipts_unavailable");
    return provider.bind(options);
}

function createReceiptPanel(
    ctx,
    { root, signal, i18n, captureRoom, isActive },
    release,
) {
    const lifetime = new AbortController();
    const panelId = `messages-readers-${crypto.randomUUID()}`;
    const popup = createAnchoredPopup({
        className: `messages-read-receipt-popup ${panelId}`,
        role: "dialog",
    });
    const hookId = `messages:receiptSession:${crypto.randomUUID()}`;
    const assertAccount = captureAccountGuard();
    const providerId = localStorage.getItem("cognis_provider_id");
    const log = ctx.capabilities.get("ui:log");
    let opening = null;
    let panelElement = null;

    function close(restoreFocus = false) {
        const previous = opening;
        const restore = restoreFocus && previous?.current();
        opening = null;
        previous?.controller.abort();
        if (previous) {
            previous.button.setAttribute("aria-expanded", "false");
            previous.button.removeAttribute("aria-controls");
        }
        popup.destroy();
        panelElement = null;
        if (
            restore &&
            previous?.ownsView() &&
            previous.button.isConnected &&
            root.contains(previous.button)
        )
            previous.button.focus();
    }

    function pageCurrent() {
        if (lifetime.signal.aborted || ctx.signal.aborted || signal?.aborted)
            return false;
        try {
            assertAccount();
            return (
                root.isConnected &&
                isActive() &&
                localStorage.getItem("cognis_provider_id") === providerId
            );
        } catch (error) {
            log?.("info", "Read receipt session changed.", {
                component: "social-messages",
                operation: "closeReadReceipts",
                errorName: error.name,
            });
            return false;
        }
    }

    function validate() {
        if (!pageCurrent()) {
            dispose();
            return false;
        }
        if (opening && !opening.current()) close();
        return true;
    }

    const observer = new MutationObserver(validate);

    async function toggle(button) {
        if (!validate() || !root.contains(button)) return;
        if (opening?.button === button) {
            close(true);
            return;
        }
        close();
        const ownsRoom = captureRoom();
        const payload = button.dataset.readers;
        const renderer = requireReceiptRenderer(
            ctx.capabilities.get("ui:profileAvatarRenderer"),
        );
        const controller = new AbortController();
        const attempt = {
            button,
            controller,
            ownsView: () =>
                pageCurrent() &&
                ownsRoom() &&
                renderer === ctx.capabilities.get("ui:profileAvatarRenderer") &&
                renderer.available === true,
            current: () =>
                opening === attempt &&
                !controller.signal.aborted &&
                attempt.ownsView() &&
                button.isConnected &&
                root.contains(button) &&
                button.dataset.readers === payload,
        };
        opening = attempt;
        try {
            const readers = JSON.parse(decodeURIComponent(payload));
            if (!Array.isArray(readers) || !readers.length) {
                close();
                return;
            }
            attempt.readers = readers;
            attempt.markup = renderReaders(readers, renderer, i18n);
            attempt.renderer = renderer;
            await ctx.runFlow(flowName, { panel: api, attempt });
            if (opening === attempt && !attempt.current()) close();
        } catch (error) {
            if (attempt.current()) {
                close();
                reportFailure(error);
            }
        }
    }

    function present(attempt) {
        if (opening !== attempt || !attempt.current()) return;
        popup.show(attempt.button, attempt.markup);
        panelElement = document.getElementsByClassName(panelId)[0];
        panelElement.id = panelId;
        panelElement.setAttribute(
            "aria-label",
            receiptHeading(attempt.readers, i18n),
        );
        attempt.button.setAttribute("aria-expanded", "true");
        attempt.button.setAttribute("aria-controls", panelId);
        const closeButton = panelElement.querySelector(
            ".messages-receipt-close",
        );
        closeButton.addEventListener("click", () => close(true), {
            signal: attempt.controller.signal,
        });
        closeButton.focus();
        log?.("info", "Read receipt panel opened.", {
            component: "social-messages",
            operation: "openReadReceipts",
        });
        void attempt.renderer
            .hydrate(panelElement, { signal: attempt.controller.signal })
            .catch((error) => {
                if (attempt.current()) reportFailure(error);
            });
    }

    function reportFailure(error) {
        if (!pageCurrent()) return;
        log?.("error", "Read receipt panel failed.", {
            component: "social-messages",
            operation: "openReadReceipts",
            errorName: error.name,
        });
        showToast(i18n.t("ui.reuse.error"), { variant: "error" });
    }

    function dispose() {
        close();
        observer.disconnect();
        lifetime.abort();
        signal?.removeEventListener("abort", dispose);
        ctx.removeFlowHook("authenticate-session", "afterSession", hookId);
        release();
    }

    const options = { signal: lifetime.signal };
    root.addEventListener(
        "click",
        (event) => {
            const button = event.target.closest?.(
                "button.messages-receipt-details",
            );
            if (button) void toggle(button).catch(reportFailure);
        },
        options,
    );
    root.addEventListener(
        "cognis:messages-thread-replacing",
        () => close(),
        options,
    );
    root.addEventListener("scroll", () => close(), options);
    document.addEventListener(
        "keydown",
        (event) => {
            if (event.key !== "Escape" || !opening) return;
            const attempt = opening;
            // Profile's document handler must get the first opportunity to consume Escape.
            queueMicrotask(() => {
                if (opening !== attempt) return;
                if (!attempt.current()) close();
                else if (!event.defaultPrevented) close(true);
            });
        },
        options,
    );
    window.addEventListener(
        "cognis:profile-avatar-renderer-changed",
        () => close(),
        options,
    );
    window.addEventListener("storage", validate, options);
    window.addEventListener("popstate", () => close(), options);
    window.addEventListener("pagehide", dispose, options);
    window.addEventListener(
        "resize",
        () => {
            if (validate()) popup.reposition();
        },
        options,
    );
    ctx.extendFlow(
        "authenticate-session",
        "afterSession",
        { id: hookId },
        validate,
    );
    signal?.addEventListener("abort", dispose, { once: true });
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-readers"],
    });
    const api = { root, close, dispose };
    if (signal?.aborted) queueMicrotask(dispose);
    return {
        api,
        current: (attempt) => opening === attempt && attempt.current(),
        present,
    };
}
