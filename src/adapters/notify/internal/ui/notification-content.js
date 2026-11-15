import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { hexToBytes } from "/static/reuse/crypto-utils.js";

import { resolveDestination, allowNavigation } from "./reuse/primary-action.js";

const notificationTextDecoder = new TextDecoder();

export function navigateNotif(actionUrl) {
    try {
        const url = resolveDestination(actionUrl);
        if (!url || !allowNavigation(url)) return;
        if (url.origin === window.location.origin) {
            navigateTo(url.pathname + url.search + url.hash);
        } else {
            window.open(url.href, "_blank", "noopener,noreferrer");
        }
    } catch {
        // malformed URL — no navigation
    }
}

function actionButtonClass(consequence) {
    if (consequence === "creative") return "btn-confirm";
    if (consequence === "destructive") return "btn-cancel";
    return "btn-neutral";
}

function safeActionIcon(iconSvg) {
    if (typeof iconSvg !== "string") return "";
    const documentNode = new DOMParser().parseFromString(
        iconSvg,
        "image/svg+xml",
    );
    const svg = documentNode.documentElement;
    if (
        svg.nodeName.toLowerCase() !== "svg" ||
        svg.querySelector("parsererror")
    )
        return "";
    const allowedElements = new Set([
        "svg",
        "path",
        "circle",
        "line",
        "polyline",
    ]);
    const allowedAttributes = new Set([
        "aria-hidden",
        "d",
        "fill",
        "focusable",
        "viewBox",
        "cx",
        "cy",
        "r",
        "x1",
        "x2",
        "y1",
        "y2",
        "points",
        "stroke",
        "stroke-width",
    ]);
    for (const element of svg.querySelectorAll("*")) {
        if (!allowedElements.has(element.nodeName.toLowerCase())) {
            element.remove();
            continue;
        }
        for (const attribute of [...element.attributes]) {
            if (!allowedAttributes.has(attribute.name)) {
                element.removeAttribute(attribute.name);
            }
        }
    }
    for (const attribute of [...svg.attributes]) {
        if (!allowedAttributes.has(attribute.name))
            svg.removeAttribute(attribute.name);
    }
    return new XMLSerializer().serializeToString(svg);
}

export function renderNotificationActions(notification) {
    const actions = notification.metadata?.actions;
    if (!Array.isArray(actions)) return "";
    const buttons = actions
        .filter(
            (action) =>
                action &&
                typeof action.id === "string" &&
                typeof action.label === "string",
        )
        .map(
            (action) =>
                `<button class="notification-action ${actionButtonClass(action.consequence)}" data-notification-action="${escapeHtml(action.id)}" type="button" aria-label="${escapeHtml(action.label)}">${safeActionIcon(action.iconSvg) || escapeHtml(action.label)}</button>`,
        )
        .join("");
    return buttons
        ? `<span class="notification-actions">${buttons}</span>`
        : "";
}

export function dispatchNotificationAction(notification, actionId) {
    window.dispatchEvent(
        new CustomEvent("cognis:notification-command", {
            detail: { actionId, notification },
        }),
    );
}

async function getRoomKey(roomId) {
    const loadChatRoomKey = uiCtx.capabilities.get(
        "social:messages:loadChatRoomKey",
    );
    return typeof loadChatRoomKey === "function"
        ? loadChatRoomKey(roomId)
        : null;
}

export function parseRoomId(actionUrl) {
    if (typeof actionUrl !== "string" || actionUrl.length === 0) return null;
    const match = actionUrl.match(/^\/messages\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

export function isNotificationOwnedByCurrentPage(notification) {
    const currentPage = window.location.pathname.split("/").filter(Boolean)[0];
    if (!currentPage) return false;

    if (notification.actionUrl) {
        try {
            const actionPage = new URL(
                notification.actionUrl,
                window.location.origin,
            ).pathname
                .split("/")
                .filter(Boolean)[0];
            if (actionPage === currentPage) return true;
        } catch {
            // Ignore malformed actions when comparing the current page.
        }
    }

    return notification.category === currentPage;
}

export async function decryptRoomMessage(
    roomId,
    { isCurrent, accessToken, signal },
) {
    const roomKey = await getRoomKey(roomId);
    if (!roomKey || !isCurrent()) return null;
    const response = await apiFetch(
        `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}/messages?limit=1`,
        { accessToken, signal },
    );
    if (!response.ok || !isCurrent()) return null;
    const payload = await response.json().catch(() => null);
    if (!isCurrent()) return null;
    const latestMessage = Array.isArray(payload?.data) ? payload.data[0] : null;
    if (
        !latestMessage ||
        typeof latestMessage.iv !== "string" ||
        typeof latestMessage.ciphertext !== "string"
    ) {
        return null;
    }
    try {
        const decrypted = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: hexToBytes(latestMessage.iv),
            },
            roomKey,
            hexToBytes(latestMessage.ciphertext),
        );
        return notificationTextDecoder.decode(decrypted).trim() || null;
    } catch {
        console.warn(
            "[notify-internal] Failed to decrypt latest room message.",
        );
        return null;
    }
}

export function localizeNotification(notification) {
    const localizedText = notification.metadata?.localizedText;
    if (!localizedText || typeof localizedText !== "object") {
        return notification;
    }
    const preferredLocales = [
        ...(navigator.languages ?? []),
        navigator.language,
        "en",
    ];
    for (const locale of preferredLocales) {
        const normalizedLocale = String(locale ?? "")
            .toLowerCase()
            .split("-")[0];
        const copy = localizedText[normalizedLocale];
        if (
            copy &&
            typeof copy.subject === "string" &&
            typeof copy.body === "string"
        ) {
            return { ...notification, subject: copy.subject, body: copy.body };
        }
    }
    return notification;
}
