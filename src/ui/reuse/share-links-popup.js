/**
 * Generic share-links popup for listing, creating, and revoking share links.
 *
 * Renders a modal dialog that displays a list of existing share links and a
 * form for generating new ones. All API calls are supplied by the caller via
 * async callback functions so this module stays provider-agnostic.
 *
 * Public exports:
 *   openShareLinksPopup(options) — opens the popup and returns a Promise that
 *     resolves when the user dismisses it.
 *
 * Usage:
 *   import { openShareLinksPopup } from '/static/reuse/share-links-popup.js';
 *
 *   await openShareLinksPopup({
 *     title: 'Share Meeting',
 *     labels: {
 *       empty: 'No share links yet.',
 *       untitled: 'Untitled',
 *       copyLink: 'Copy Link',
 *       revoke: 'Revoke',
 *       label: 'Label',
 *       labelPlaceholder: 'Enter a label…',
 *       expiryLabel: 'Expires in (hours)',
 *       generateLink: 'Generate Link',
 *       done: 'Done',
 *       createFailed: 'Failed to create link.',
 *       copySuccess: 'Link copied!',
 *       copyFailed: 'Failed to copy link.',
 *       deleteFailed: 'Failed to revoke link.',
 *     },
 *     fetchLinks: async () => [{ id, label, shareUrl }],
 *     createLink: async ({ label, expiresInHours }) => ({ shareUrl }),
 *     deleteLink: async ({ shareId }) => {},
 *   });
 *
 * @param {{
 *   title: string,
 *   labels: {
 *     empty: string,
 *     untitled: string,
 *     copyLink: string,
 *     revoke: string,
 *     label: string,
 *     labelPlaceholder: string,
 *     expiryLabel: string,
 *     generateLink: string,
 *     done: string,
 *     createFailed: string,
 *     copySuccess: string,
 *     copyFailed: string,
 *     deleteFailed: string,
 *   },
 *   fetchLinks: () => Promise<Array<{ id: string, label: string, shareUrl: string }>>,
 *   createLink: (opts: { label: string, expiresInHours: string }) => Promise<{ shareUrl?: string } | null>,
 *   deleteLink: (opts: { shareId: string }) => Promise<void>,
 * }} options
 * @returns {Promise<void>}
 */

import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";

const STYLESHEET_HREF = "/static/styles/reuse/share-links-popup.css";

let stylesheetReady = null;

function ensureStylesheet() {
    if (stylesheetReady) return stylesheetReady;
    const existing = document.querySelector(`link[href="${STYLESHEET_HREF}"]`);
    if (existing) {
        stylesheetReady = existing.sheet
            ? Promise.resolve()
            : new Promise((resolve) => {
                  existing.addEventListener("load", resolve, { once: true });
              });
        return stylesheetReady;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = STYLESHEET_HREF;
    stylesheetReady = new Promise((resolve) => {
        link.addEventListener("load", resolve, { once: true });
    });
    document.head.appendChild(link);
    return stylesheetReady;
}

function renderRows(labels, links) {
    if (!Array.isArray(links) || links.length === 0) {
        return `<p class="share-links-empty">${escapeHtml(labels.empty)}</p>`;
    }
    return `
        <div class="share-links-list">
            ${links
                .map(
                    (link) => `
                        <article class="share-links-row">
                            <div class="share-links-row-main">
                                <p class="share-links-row-label">${escapeHtml(String(link.label ?? labels.untitled))}</p>
                                <p class="share-links-row-url">${escapeHtml(String(link.shareUrl ?? ""))}</p>
                            </div>
                            <div class="share-links-row-actions">
                                <button type="button" class="btn-confirm btn-animated" data-share-copy="${escapeHtml(String(link.shareUrl ?? ""))}">${escapeHtml(labels.copyLink)}</button>
                                <button type="button" class="btn-cancel btn-animated" data-share-delete="${escapeHtml(String(link.id ?? ""))}">${escapeHtml(labels.revoke)}</button>
                            </div>
                        </article>
                    `,
                )
                .join("")}
        </div>
    `;
}

function renderBody(labels, state) {
    return `
        <section class="share-links-popup">
            <div class="share-links-create-form">
                <label>
                    <span>${escapeHtml(labels.label)}</span>
                    <input id="share-links-label" type="text" value="${escapeHtml(state.label)}" placeholder="${escapeHtml(labels.labelPlaceholder)}" />
                </label>
                <label>
                    <span>${escapeHtml(labels.expiryLabel)}</span>
                    <input id="share-links-expiry" type="number" min="1" step="1" value="${escapeHtml(state.expiresInHours)}" placeholder="24" />
                </label>
                <button id="share-links-create-btn" class="btn-confirm btn-animated" type="button" ${state.loading ? "disabled" : ""}>${escapeHtml(labels.generateLink)}</button>
            </div>
            ${renderRows(labels, state.links)}
        </section>
    `;
}

export async function openShareLinksPopup({
    title,
    labels,
    fetchLinks,
    createLink,
    deleteLink,
}) {
    await ensureStylesheet();

    const state = {
        loading: false,
        links: [],
        label: "",
        expiresInHours: "24",
    };

    async function loadLinks() {
        state.loading = true;
        state.links = await fetchLinks().catch(() => []);
        state.loading = false;
    }

    function rerender(overlay) {
        const body = overlay.querySelector(".popup-body");
        if (!(body instanceof HTMLElement)) return;
        body.innerHTML = renderBody(labels, state);
        attachHandlers(overlay);
    }

    async function handleCreate(overlay) {
        state.loading = true;
        rerender(overlay);
        let shareUrl = null;
        try {
            const result = await createLink({
                label: state.label,
                expiresInHours: state.expiresInHours,
            });
            shareUrl = result?.shareUrl ?? null;
        } catch {
            showToast(labels.createFailed, { variant: "error" });
            state.loading = false;
            rerender(overlay);
            return;
        }
        state.loading = false;
        await loadLinks();
        rerender(overlay);
        if (shareUrl) {
            navigator.clipboard
                .writeText(String(shareUrl))
                .then(() => {
                    showToast(labels.copySuccess, { variant: "success" });
                })
                .catch(() => {
                    showToast(labels.copyFailed, { variant: "error" });
                });
        }
    }

    async function handleDelete(overlay, shareId) {
        state.loading = true;
        rerender(overlay);
        try {
            await deleteLink({ shareId });
        } catch {
            showToast(labels.deleteFailed, { variant: "error" });
            state.loading = false;
            rerender(overlay);
            return;
        }
        state.loading = false;
        await loadLinks();
        rerender(overlay);
    }

    function attachHandlers(overlay) {
        overlay
            .querySelector("#share-links-label")
            ?.addEventListener("input", (event) => {
                state.label = String(event.target?.value ?? "");
            });
        overlay
            .querySelector("#share-links-expiry")
            ?.addEventListener("input", (event) => {
                state.expiresInHours = String(event.target?.value ?? "");
            });
        overlay
            .querySelector("#share-links-create-btn")
            ?.addEventListener("click", () => {
                void handleCreate(overlay);
            });
        overlay.querySelectorAll("[data-share-copy]").forEach((button) => {
            button.addEventListener("click", () => {
                const shareUrl = String(
                    button.getAttribute("data-share-copy") ?? "",
                );
                if (!shareUrl) return;
                navigator.clipboard
                    .writeText(shareUrl)
                    .then(() => {
                        showToast(labels.copySuccess, { variant: "success" });
                    })
                    .catch(() => {
                        showToast(labels.copyFailed, { variant: "error" });
                    });
            });
        });
        overlay.querySelectorAll("[data-share-delete]").forEach((button) => {
            button.addEventListener("click", () => {
                const shareId = String(
                    button.getAttribute("data-share-delete") ?? "",
                );
                if (!shareId) return;
                void handleDelete(overlay, shareId);
            });
        });
    }

    await loadLinks();
    await openPopup({
        title,
        body: () => renderBody(labels, state),
        actions: [
            {
                id: "done",
                label: labels.done,
                variant: "confirm",
            },
        ],
        onOpen: (overlay) => {
            attachHandlers(overlay);
        },
    });
}
