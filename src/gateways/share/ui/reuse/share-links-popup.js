/**
 * Share-gateway-owned popup for listing, creating, and revoking share links.
 *
 * Renders a modal dialog that displays a list of existing share links and a
 * form for generating new ones. All API calls are supplied by the caller via
 * async callback functions so this module stays provider-agnostic. It lives
 * under the Share gateway's own `ui/reuse` directory (not a generic
 * `src/ui/reuse` helper) so that disabling the Share gateway means this
 * static asset is never served, the dynamic import fails, and no share popup
 * or link-creation logic is ever created in the first place.
 *
 * Public exports:
 *   openShareLinksPopup(options) — opens the popup and returns a Promise that
 *     resolves when the user dismisses it.
 *
 * Usage:
 *   import { openShareLinksPopup } from
 *     '/static/gateways/share/ui/reuse/share-links-popup.js';
 *
 *   await openShareLinksPopup({
 *     title: 'Share Meeting',
 *     labels: {
 *       empty: 'No share links yet.',
 *       untitled: 'Untitled',
 *       copyLink: 'Copy Link',
 *       revoke: 'Revoke',
 *       shareOptions: 'Share:',
 *       mail: 'Mail',
 *       label: 'Label',
 *       labelPlaceholder: 'Enter a label…',
 *       expiryLabel: 'Expires in (hours)',
 *       generateLink: 'Generate Link',
 *       done: 'Done',
 *       createFailed: 'Failed to create link.',
 *       copySuccess: 'Link copied!',
 *       copyFailed: 'Failed to copy link.',
 *       deleteFailed: 'Failed to revoke link.',
 *       statusActive: 'Active',
 *       statusExpired: 'Expired',
 *       expiresAtLabel: 'Expires',
 *       expiredAtLabel: 'Expired',
 *     },
 *     fetchLinks: async () => [{ id, label, shareUrl, status, expiresAt, quickShareActions: [] }],
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
 *     shareOptions: string,
 *     mail: string,
 *     label: string,
 *     labelPlaceholder: string,
 *     expiryLabel: string,
 *     generateLink: string,
 *     done: string,
 *     createFailed: string,
 *     copySuccess: string,
 *     copyFailed: string,
 *     deleteFailed: string,
 *     statusActive: string,
 *     statusExpired: string,
 *     expiresAtLabel: string,
 *     expiredAtLabel: string,
 *     users?: string,
 *     userSearchPlaceholder?: string,
 *     removeUser?: string,
 *     readPermission?: string,
 *     writePermission?: string,
 *   },
 *   fetchLinks: () => Promise<Array<{
 *     id: string,
 *     label: string,
 *     shareUrl: string,
 *     status?: 'active' | 'expired',
 *     expiresAt?: string,
 *     quickShareActions?: Array<{ id: string, label: string, href: string }>,
 *   }>>,
 *   createLink: (opts: { label: string, expiresInHours: string }) => Promise<{
 *     shareUrl?: string,
 *     quickShareActions?: Array<{ id: string, label: string, href: string }>,
 *   } | null>,
 *   deleteLink: (opts: { shareId: string }) => Promise<void>,
 *   updateLink?: (opts: { shareId: string, accessControls: object }) => Promise<object|null>,
 *   searchUsers?: (query: string) => Promise<Array<{id: string, label: string, handle?: string}>>,
 * }} options
 * @returns {Promise<void>}
 */

import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { formatDateTime } from "/static/reuse/timestamp.js";
import { copyTextToClipboard } from "/static/reuse/clipboard.js";

const STYLESHEET_HREF = "/static/gateways/share/ui/reuse/share-links-popup.css";
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

function renderQuickShareActions(link, labels) {
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
            if (id === "smtp") {
                return `
          <a
            class="btn-neutral btn-animated"
            href="${escapeHtml(href)}"
            target="_blank"
            rel="noopener noreferrer"
            data-share-quick-action="${escapeHtml(id)}"
            aria-label="${escapeHtml(labels.mail)}"
            title="${escapeHtml(labels.mail)}"
          ><span class="share-links-row-mail-icon" aria-hidden="true"></span></a>
        `;
            }
            return `
        <a
          class="btn-neutral btn-animated share-links-row-quick-action"
          href="${escapeHtml(href)}"
          data-share-quick-action="${escapeHtml(id)}"
        >${escapeHtml(label)}</a>
      `;
        })
        .join("");
}

function renderShareStatus(link, labels) {
    const expiresAt = String(link?.expiresAt ?? "").trim();
    const isExpired = link?.status === "expired";
    const statusLabel = isExpired ? labels.statusExpired : labels.statusActive;
    const statusClass = isExpired
        ? "share-links-row-status-expired"
        : "share-links-row-status-active";
    const timeLabel = expiresAt
        ? `${isExpired ? labels.expiredAtLabel : labels.expiresAtLabel}: ${formatDateTime(expiresAt)}`
        : "";
    return `
    <div class="share-links-row-status-line">
      <span class="share-links-row-status ${statusClass}">${escapeHtml(statusLabel)}</span>
      ${timeLabel ? `<span class="share-links-row-expiry">${escapeHtml(timeLabel)}</span>` : ""}
    </div>
  `;
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
              const recipients = Array.isArray(link?.accessControls?.recipients)
                  ? link.accessControls.recipients.filter(
                        (entry) => entry?.type === "user",
                    )
                  : [];
              return `
            <article class="share-links-row">
              <button
                type="button"
                class="popup-close-btn btn-cancel btn-animated share-links-row-close"
                data-share-delete="${escapeHtml(shareId)}"
                aria-label="${escapeHtml(labels.revoke)}"
                title="${escapeHtml(labels.revoke)}"
              >&#x2715;</button>
              <div class="share-links-row-main">
                <div class="share-links-row-header">
                  <p class="share-links-row-label">${escapeHtml(shareLabel)}</p>
                  <button
                    type="button"
                    class="share-links-row-copy"
                    data-share-copy="${escapeHtml(shareUrl)}"
                    title="${escapeHtml(shareUrl)}"
                    aria-label="${escapeHtml(labels.copyLink)}: ${escapeHtml(shareUrl)}"
                  >🔗</button>
                </div>
                ${renderShareStatus(link, labels)}
                ${recipients.length ? `<div class="share-links-recipients">${recipients.map((recipient) => `<span class="share-links-recipient-chip">${escapeHtml(recipient.label || recipient.id)}<button type="button" data-share-recipient-remove="${escapeHtml(recipient.id)}" data-share-id="${escapeHtml(shareId)}" aria-label="${escapeHtml(labels.removeUser || labels.revoke)}">×</button></span>`).join("")}</div>` : ""}
              </div>
              <div class="share-links-row-share">
                <span class="share-links-row-share-label">${escapeHtml(labels.shareOptions)}</span>
                <div class="share-links-row-actions">
                  ${renderQuickShareActions(link, labels)}
                </div>
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
          ${
              state.userSharingEnabled
                  ? `<div class="share-links-user-picker">
            <label><span>${escapeHtml(labels.users || "Share with users")}</span>
              <input id="share-links-user-search" type="search" autocomplete="off" placeholder="${escapeHtml(labels.userSearchPlaceholder || "Search users…")}" />
            </label>
            <div class="share-links-user-results"></div>
            <div class="share-links-selected-users">${state.recipients.map((recipient) => `<span class="share-links-recipient-chip">${escapeHtml(recipient.label || recipient.id)}<button type="button" data-selected-recipient-remove="${escapeHtml(recipient.id)}">×</button></span>`).join("")}</div>
          </div>`
                  : ""
          }
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
    updateLink,
    searchUsers,
}) {
    await ensureStylesheet();

    const state = {
        isCreating: false,
        links: [],
        label: "",
        expiresInHours: "24",
        recipients: [],
        userSharingEnabled: typeof searchUsers === "function",
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
            const userSearch = overlay.querySelector(
                "#share-links-user-search",
            );
            const userResults = overlay.querySelector(
                ".share-links-user-results",
            );
            const selectedUsers = overlay.querySelector(
                ".share-links-selected-users",
            );
            const renderSelectedUsers = () => {
                if (!(selectedUsers instanceof HTMLElement)) return;
                selectedUsers.innerHTML = state.recipients
                    .map(
                        (recipient) =>
                            `<span class="share-links-recipient-chip">${escapeHtml(recipient.label || recipient.id)}<button type="button" data-selected-recipient-remove="${escapeHtml(recipient.id)}">×</button></span>`,
                    )
                    .join("");
            };

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
            let searchSequence = 0;
            if (
                userSearch instanceof HTMLInputElement &&
                userResults instanceof HTMLElement
            ) {
                userSearch.addEventListener("input", async () => {
                    const sequence = ++searchSequence;
                    const users = await searchUsers(userSearch.value).catch(
                        () => [],
                    );
                    if (sequence !== searchSequence) return;
                    userResults.innerHTML = users
                        .filter(
                            (user) =>
                                !state.recipients.some(
                                    (entry) => entry.id === user.id,
                                ),
                        )
                        .map(
                            (user) =>
                                `<button type="button" class="share-links-user-result" data-share-user-id="${escapeHtml(user.id)}" data-share-user-label="${escapeHtml(user.label || user.handle || user.id)}">${escapeHtml(user.label || user.handle || user.id)}${user.handle ? ` <small>@${escapeHtml(user.handle)}</small>` : ""}</button>`,
                        )
                        .join("");
                });
                userResults.addEventListener("click", (event) => {
                    const button = event.target.closest("[data-share-user-id]");
                    if (!(button instanceof HTMLElement)) return;
                    state.recipients.push({
                        type: "user",
                        id: button.dataset.shareUserId,
                        label: button.dataset.shareUserLabel,
                        permissions: ["read"],
                    });
                    userSearch.value = "";
                    userResults.innerHTML = "";
                    renderSelectedUsers();
                });
                selectedUsers?.addEventListener("click", (event) => {
                    const button = event.target.closest(
                        "[data-selected-recipient-remove]",
                    );
                    if (!(button instanceof HTMLElement)) return;
                    state.recipients = state.recipients.filter(
                        (entry) =>
                            entry.id !== button.dataset.selectedRecipientRemove,
                    );
                    renderSelectedUsers();
                });
            }

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
                        recipients: state.recipients,
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
                // Clear the custom label after a successful create so the
                // next link starts from a blank label instead of reusing it.
                state.label = "";
                state.recipients = [];
                renderSelectedUsers();
                labelInput.value = "";
                await refreshLinks();
                if (popupOpen) {
                    renderLinksList(listContainer);
                }

                if (shareUrl) {
                    copyTextToClipboard(String(shareUrl)).then((copied) => {
                        showToast(
                            copied ? labels.copySuccess : labels.copyFailed,
                            { variant: copied ? "success" : "error" },
                        );
                    });
                }
            });

            listContainer.addEventListener("click", (event) => {
                if (!(event.target instanceof HTMLElement)) {
                    return;
                }

                const copyButton = event.target.closest("[data-share-copy]");
                if (copyButton instanceof HTMLElement) {
                    event.preventDefault();
                    const shareUrl = String(
                        copyButton.getAttribute("data-share-copy") ?? "",
                    );
                    if (!shareUrl) {
                        return;
                    }
                    copyTextToClipboard(shareUrl).then((copied) => {
                        showToast(
                            copied ? labels.copySuccess : labels.copyFailed,
                            { variant: copied ? "success" : "error" },
                        );
                    });
                    return;
                }

                const recipientRemove = event.target.closest(
                    "[data-share-recipient-remove]",
                );
                if (
                    recipientRemove instanceof HTMLElement &&
                    typeof updateLink === "function"
                ) {
                    const link = state.links.find(
                        (entry) =>
                            String(entry.id) ===
                            recipientRemove.dataset.shareId,
                    );
                    const recipients = (
                        link?.accessControls?.recipients || []
                    ).filter(
                        (entry) =>
                            entry.id !==
                            recipientRemove.dataset.shareRecipientRemove,
                    );
                    void updateLink({
                        shareId: recipientRemove.dataset.shareId,
                        accessControls: { ...link.accessControls, recipients },
                    })
                        .then(async () => {
                            await refreshLinks();
                            if (popupOpen) renderLinksList(listContainer);
                        })
                        .catch(() =>
                            showToast(labels.deleteFailed, {
                                variant: "error",
                            }),
                        );
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
