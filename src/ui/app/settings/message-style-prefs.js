import { uiCtx } from "../../reuse/ui-ctx.js";
import {
    isValidMessageStyle,
    normalizeMessageStyle,
} from "../../reuse/message-style-options.js";
import { ensurePageStylesheet } from "../../reuse/page-styles.js";
import { replaceMountScope } from "../../reuse/mount-scope.js";
import { showToast } from "../../reuse/toast.js";

const capabilityName = "social:messagePresentation";
const bindings = new WeakMap();

function sampleRecords(i18n) {
    const incoming = {
        senderId: "sample-incoming",
        senderDisplayName: i18n.t(
            "ui.app.settings.message_preview_participant",
        ),
        senderHandle: i18n.t("ui.app.settings.message_preview_handle"),
    };
    const outgoing = {
        senderId: "sample-outgoing",
        senderDisplayName: i18n.t("ui.app.settings.message_preview_self"),
        senderHandle: i18n.t("ui.app.settings.message_preview_self_handle"),
    };
    return [incoming, outgoing, incoming].map((participant, index) => ({
        ...participant,
        id: `sample-${index}`,
        createdAt: new Date(
            Date.UTC(2026, 0, 15, 14, 30 + index),
        ).toISOString(),
        text: i18n.t(`ui.app.settings.message_preview_text_${index + 1}`),
    }));
}

export function initMessageStylePrefs(
    root,
    { existingPrefs, i18n, onDirtyChange, signal },
) {
    let savedMessageStyle = normalizeMessageStyle(existingPrefs?.messageStyle);
    let currentMessageStyle = savedMessageStyle;
    let binding;
    let renderOrder = 0;
    let stylesheetLease;
    const records = sampleRecords(i18n);
    const log = uiCtx.capabilities.get("ui:log");

    function releaseStyles() {
        stylesheetLease?.controller.abort();
        stylesheetLease = undefined;
    }

    function prepareStyles(provider, signal) {
        if (
            stylesheetLease?.provider === provider &&
            stylesheetLease.binding === signal
        ) {
            return stylesheetLease.ready;
        }
        releaseStyles();
        const controller = replaceMountScope(null, signal);
        const abort = () => controller.abort();
        provider.signal.addEventListener("abort", abort, { once: true });
        controller.signal.addEventListener(
            "abort",
            () => {
                provider.signal.removeEventListener("abort", abort);
            },
            { once: true },
        );
        const lease = { provider, binding: signal, controller, ready: null };
        stylesheetLease = lease;
        lease.ready = Promise.all(
            provider.stylesheets.map((path) =>
                ensurePageStylesheet(path, { signal: controller.signal }),
            ),
        ).catch((error) => {
            if (stylesheetLease === lease) releaseStyles();
            throw error;
        });
        return lease.ready;
    }

    async function renderPreview() {
        const order = ++renderOrder;
        const activeSignal = binding?.signal;
        if (!activeSignal || activeSignal.aborted) return;
        const region = root.querySelector("[data-message-style-preview]");
        const preview = region?.querySelector("[data-message-preview-thread]");
        if (!preview) return;
        const provider = uiCtx.capabilities.get(capabilityName);
        const available =
            provider?.version === 2 &&
            provider.available === true &&
            typeof provider.signal?.aborted === "boolean" &&
            typeof provider.signal.addEventListener === "function" &&
            typeof provider.signal.removeEventListener === "function" &&
            !provider.signal.aborted &&
            typeof provider.render === "function" &&
            Array.isArray(provider.stylesheets) &&
            provider.stylesheets.every(
                (path) =>
                    typeof path === "string" &&
                    path.startsWith("/static/") &&
                    path.endsWith(".css"),
            );
        region.hidden = true;
        if (!available) {
            releaseStyles();
            preview.replaceChildren();
            return;
        }
        const isCurrent = () =>
            !activeSignal.aborted &&
            order === renderOrder &&
            uiCtx.capabilities.get(capabilityName) === provider &&
            !provider.signal?.aborted &&
            provider.available === true;
        try {
            await prepareStyles(provider, activeSignal);
            if (!isCurrent()) return;
            const style = currentMessageStyle;
            const markup = await provider.render({
                style,
                records,
                currentAccountId: "sample-outgoing",
            });
            if (!isCurrent()) return;
            region.dataset.messageStyle = style;
            preview.innerHTML = markup;
            region.hidden = false;
        } catch (error) {
            if (!isCurrent()) return;
            log?.("error", "message_style_preview_failed", {
                component: "ui.settings",
                operation: "previewMessageStyle",
                errorName: error.name,
            });
            showToast(i18n.t("ui.app.settings.message_preview_failed"), {
                variant: "error",
            });
            if (error?.code === "missing_translation") throw error;
        }
    }

    function updateSelector() {
        for (const button of root.querySelectorAll(".message-style-btn")) {
            const selected =
                button.dataset.messageStyleValue === currentMessageStyle;
            button.classList.toggle("active", selected);
            button.setAttribute("aria-pressed", String(selected));
        }
        return renderPreview();
    }

    return {
        bind() {
            releaseStyles();
            binding = replaceMountScope(bindings.get(root), signal);
            bindings.set(root, binding);
            for (const button of root.querySelectorAll(".message-style-btn")) {
                button.addEventListener(
                    "click",
                    () => {
                        const nextStyle = button.dataset.messageStyleValue;
                        if (!isValidMessageStyle(nextStyle)) return;
                        currentMessageStyle = nextStyle;
                        updateSelector();
                        onDirtyChange?.(
                            currentMessageStyle !== savedMessageStyle,
                        );
                        log?.("info", "message_style_selected", {
                            component: "ui.settings",
                            operation: "selectMessageStyle",
                            style: nextStyle,
                        });
                    },
                    { signal: binding.signal },
                );
            }
            window.addEventListener(
                "cognis:message-presentation-changed",
                renderPreview,
                { signal: binding.signal },
            );
            return updateSelector();
        },
        getMessageStyle: () => currentMessageStyle,
        isDirty: () => currentMessageStyle !== savedMessageStyle,
        commit() {
            savedMessageStyle = currentMessageStyle;
        },
        discard() {
            currentMessageStyle = savedMessageStyle;
            updateSelector();
            onDirtyChange?.(false);
        },
    };
}
