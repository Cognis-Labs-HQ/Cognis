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
 *     fetchLinks: async () => [{ id, label, shareUrl, quickShareActions: [] }],
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
 *   fetchLinks: () => Promise<Array<{
 *     id: string,
 *     label: string,
 *     shareUrl: string,
 *     quickShareActions?: Array<{ id: string, label: string, href: string }>,
 *   }>>,
 *   createLink: (opts: { label: string, expiresInHours: string }) => Promise<{
 *     shareUrl?: string,
 *     quickShareActions?: Array<{ id: string, label: string, href: string }>,
 *   } | null>,
 *   deleteLink: (opts: { shareId: string }) => Promise<void>,
 * }} options
 * @returns {Promise<void>}
 */

import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";

const STYLESHEET_HREF = "/static/styles/reuse/share-links-popup.css";
const SHARE_LINKS_REFRESH_INTERVAL_MS = 10_000;

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

function renderQuickShareActions(link) {
    const quickShareActions = Array.isArray(link?.quickShareActions)
        ? link.quickShareActions
        : [];
    return quickShareActions
        .map((action) => {
            const href = String(action?.href ?? "").trim();
            const label = String(action?.label ?? "").trim();
            const id = String(action?.id ?? "").trim();
            if (!href || !label) {
                return "";
            }
            return `
        <a
          class="btn-confirm btn-animated share-links-row-quick-action"
          href="${escapeHtml(href)}"
          data-share-quick-action="${escapeHtml(id)}"
        >${escapeHtml(label)}</a>
      `;
        })
        .join("");
}

function renderRows(labels, links) {
    if (!Array.isArray(links) || links.length === 0) {
        return `<p class="share-links-empty">${escapeHtml(labels.empty)}</p>`;
    }
    return `
    <div class="share-links-list">
      ${links
          .map((link) => {
              const shareUrl = String(link?.shareUrl ?? "");
              const shareId = String(link?.id ?? "");
              const shareLabel =
                  String(link?.label ?? "").trim() || labels.untitled;
              return `
            <article class="share-links-row">
              <div class="share-links-row-main">
                <div class="share-links-row-header">
                  <p class="share-links-row-label">${escapeHtml(shareLabel)}</p>
                  <button
                    type="button"
                    class="share-links-row-copy"
                    data-share-copy="${escapeHtml(shareUrl)}"
                    title="${escapeHtml(shareUrl)}"
                    aria-label="${escapeHtml(labels.copyLink)}: ${escapeHtml(shareUrl)}"
                  >${escapeHtml(shareUrl)}</button>
                </div>
              </div>
              <div class="share-links-row-actions">
                ${renderQuickShareActions(link)}
                <button
                  type="button"
                  class="btn-cancel btn-animated"
                  data-share-delete="${escapeHtml(shareId)}"
                >${escapeHtml(labels.revoke)}</button>
              </div>
            </article>
          `;
          })
          .join("")}
    </div>
  `;
}

function renderBody(labels, state) {
    return `
    <section class="share-links-popup">
      <div class="share-links-form-container">
        <div class="share-links-create-form">
          <label>
            <span>${escapeHtml(labels.label)}</span>
            <input
              id="share-links-label"
              type="text"
              value="${escapeHtml(state.label)}"
              placeholder="${escapeHtml(labels.labelPlaceholder)}"
            />
          </label>
          <label>
            <span>${escapeHtml(labels.expiryLabel)}</span>
            <input
              id="share-links-expiry"
              type="number"
              min="1"
              step="1"
              value="${escapeHtml(state.expiresInHours)}"
              placeholder="24"
            />
          </label>
          <button
            id="share-links-create-btn"
            class="btn-confirm btn-animated"
            type="button"
          >${escapeHtml(labels.generateLink)}</button>
        </div>
      </div>
      <div class="share-links-list-container">
        ${renderRows(labels, state.links)}
      </div>
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
        isCreating: false,
        links: [],
        label: "",
        expiresInHours: "24",
    };

    async function refreshLinks({ preserveOnError = true } = {}) {
        try {
            state.links = await fetchLinks();
        } catch {
            if (!preserveOnError) {
                state.links = [];
            }
        }
    }

    function renderLinksList(listContainer) {
        if (!(listContainer instanceof HTMLElement)) {
            return;
        }
        listContainer.innerHTML = renderRows(labels, state.links);
    }

    function syncCreateButton(createButton) {
        if (!(createButton instanceof HTMLButtonElement)) {
            return;
        }
        createButton.disabled = state.isCreating;
    }

    await refreshLinks({ preserveOnError: false });

    let refreshTimer = null;
    let popupOpen = false;

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
            const labelInput = overlay.querySelector("#share-links-label");
            const expiryInput = overlay.querySelector("#share-links-expiry");
            const createButton = overlay.querySelector(
                "#share-links-create-btn",
            );
            const listContainer = overlay.querySelector(
                ".share-links-list-container",
            );

            if (!(labelInput instanceof HTMLInputElement)) {
                return;
            }
            if (!(expiryInput instanceof HTMLInputElement)) {
                return;
            }
            if (!(createButton instanceof HTMLButtonElement)) {
                return;
            }
            if (!(listContainer instanceof HTMLElement)) {
                return;
            }

            popupOpen = true;
            syncCreateButton(createButton);

            labelInput.addEventListener("input", (event) => {
                state.label = String(event.target?.value ?? "");
            });
            expiryInput.addEventListener("input", (event) => {
                state.expiresInHours = String(event.target?.value ?? "");
            });

            createButton.addEventListener("click", async () => {
                if (state.isCreating) {
                    return;
                }
                state.isCreating = true;
                syncCreateButton(createButton);

                let shareUrl = null;
                try {
                    const result = await createLink({
                        label: state.label,
                        expiresInHours: state.expiresInHours,
                    });
                    shareUrl = result?.shareUrl ?? null;
                } catch {
                    showToast(labels.createFailed, { variant: "error" });
                    state.isCreating = false;
                    syncCreateButton(createButton);
                    return;
                }

                state.isCreating = false;
                syncCreateButton(createButton);
                await refreshLinks();
                if (popupOpen) {
                    renderLinksList(listContainer);
                }

                if (shareUrl) {
                    navigator.clipboard
                        .writeText(String(shareUrl))
                        .then(() => {
                            showToast(labels.copySuccess, {
                                variant: "success",
                            });
                        })
                        .catch(() => {
                            showToast(labels.copyFailed, { variant: "error" });
                        });
                }
            });

            listContainer.addEventListener("click", (event) => {
                if (!(event.target instanceof HTMLElement)) {
                    return;
                }

                const copyButton = event.target.closest("[data-share-copy]");
                if (copyButton instanceof HTMLElement) {
                    const shareUrl = String(
                        copyButton.getAttribute("data-share-copy") ?? "",
                    );
                    if (!shareUrl) {
                        return;
                    }
                    navigator.clipboard
                        .writeText(shareUrl)
                        .then(() => {
                            showToast(labels.copySuccess, {
                                variant: "success",
                            });
                        })
                        .catch(() => {
                            showToast(labels.copyFailed, { variant: "error" });
                        });
                    return;
                }

                const deleteButton = event.target.closest(
                    "[data-share-delete]",
                );
                if (!(deleteButton instanceof HTMLElement)) {
                    return;
                }
                const shareId = String(
                    deleteButton.getAttribute("data-share-delete") ?? "",
                );
                if (!shareId) {
                    return;
                }
                void deleteLink({ shareId })
                    .then(async () => {
                        await refreshLinks();
                        if (popupOpen) {
                            renderLinksList(listContainer);
                        }
                    })
                    .catch(() => {
                        showToast(labels.deleteFailed, { variant: "error" });
                    });
            });

            refreshTimer = window.setInterval(() => {
                void refreshLinks().then(() => {
                    if (popupOpen) {
                        renderLinksList(listContainer);
                    }
                });
            }, SHARE_LINKS_REFRESH_INTERVAL_MS);
        },
    });

    popupOpen = false;
    if (refreshTimer !== null) {
        clearInterval(refreshTimer);
    }
}
