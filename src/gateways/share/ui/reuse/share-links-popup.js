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
 *     deleteConfirmTitle?: string,
 *     deleteConfirmMessage?: string,
 *     confirm?: string,
 *     cancel?: string,
 *     statusActive: string,
 *     statusExpired: string,
 *     expiresAtLabel: string,
 *     expiredAtLabel: string,
 *     users?: string,
 *     userSearchPlaceholder?: string,
 *     removeUser?: string,
 *     readPermission?: string,
 *     writePermission?: string,
 *     methods?: string,
 *     linkMethod?: string,
 *     userMethod?: string,
 *     shareWithUsers?: string,
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
 *   fetchMethods?: () => Promise<Array<{id: string, name: string, pageModuleUrl?: string}>>,
 * }} options
 * @returns {Promise<void>}
 */
import { escapeHtml } from "/static/reuse/escape-html.js";
import {
    getInitialsText,
    pickInitialsColor,
} from "/static/reuse/avatar-utils.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { formatDateTime } from "/static/reuse/timestamp.js";
import { copyTextToClipboard } from "/static/reuse/clipboard.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";
import { renderInfoTooltip } from "/static/reuse/info-tooltip.js";
import {
    bindSecretVisibilityToggles,
    renderSecretVisibilityField,
} from "/static/reuse/secret-visibility-toggle.js";
import { buildShareTokenCallbacks } from "./share-api.js";
const STYLESHEET_HREF = "/static/gateways/share/ui/reuse/share-links-popup.css";
const SHARE_LINKS_REFRESH_INTERVAL_MS = 10_000;
let stylesheetReady = null;

function buildRecipientAvatarMarkup(options) {
    const avatarRenderer = uiCtx.capabilities.get("ui:profileAvatarRenderer");
    if (avatarRenderer?.buildMarkup) {
        return avatarRenderer.buildMarkup(options);
    }
    const avatarClass = escapeHtml(options.avatarClass);
    const fallbackClass = escapeHtml(options.fallbackClass);
    const color = escapeHtml(pickInitialsColor(options.colorSeed));
    const initials = escapeHtml(getInitialsText(options.label));
    return (
        `<span class="${avatarClass}">` +
        `<span class="${fallbackClass}" style="--initials-bg: ${color};">` +
        `${initials}</span></span>`
    );
}

function hydrateRecipientAvatars(container) {
    return uiCtx.capabilities
        .get("ui:profileAvatarRenderer")
        ?.hydrate?.(container);
}
export function openSharePopup({
    resourceType,
    resourceId,
    grantedCapabilities = [],
    passwordRequired = false,
    ...popupOptions
}) {
    return openShareLinksPopup({
        ...popupOptions,
        passwordRequired,
        defaultGrantedCapabilities: grantedCapabilities,
        ...buildShareTokenCallbacks({
            resourceType,
            resourceId,
            grantedCapabilities,
        }),
    });
}
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
              const isUserShare = recipients.length > 0;
              const variants = Array.isArray(link?.variants)
                  ? link.variants
                  : [];
              const createdAt = String(link?.createdAt ?? "").trim();
              return `
            <article class="share-links-row" data-share-edit="${escapeHtml(shareId)}">
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
                  ${
                      isUserShare
                          ? ""
                          : `<button
                    type="button"
                    class="share-links-row-copy"
                    data-share-copy="${escapeHtml(shareUrl)}"
                    title="${escapeHtml(shareUrl)}"
                    aria-label="${escapeHtml(labels.copyLink)}: ${escapeHtml(shareUrl)}"
                  >🔗</button>`
                  }
                </div>
                ${renderShareStatus(link, labels)}
                ${createdAt ? `<p class="share-links-row-created">${escapeHtml(labels.createdAtLabel || "Created")}: ${escapeHtml(formatDateTime(createdAt))}</p>` : ""}
                ${recipients.length ? `<div class="share-links-recipients">${recipients.map((recipient) => `<span class="share-links-recipient-chip">${buildRecipientAvatarMarkup({ avatarKey: recipient.avatarKey || null, label: recipient.label || recipient.handle || recipient.id, colorSeed: recipient.handle || recipient.id, profileHandle: recipient.handle || null, avatarClass: "share-links-user-avatar", imageClass: "share-links-user-avatar-image", fallbackClass: "share-links-user-avatar-fallback" })}<span>${escapeHtml(recipient.label || recipient.id)}</span><small>${escapeHtml(recipient.permissions?.includes("write") ? labels.writePermission || "Write" : labels.readPermission || "Read")}</small></span>`).join("")}</div>` : ""}
                ${!isUserShare && variants.length ? `<div class="share-links-variants">${variants.map((variant) => `<button type="button" class="share-links-variant" data-share-copy="${escapeHtml(variant.url)}" title="${escapeHtml(variant.url)}">${escapeHtml(variant.label)}</button>`).join("")}</div>` : ""}
              </div>
              ${
                  isUserShare
                      ? ""
                      : `<div class="share-links-row-share">
                <span class="share-links-row-share-label">${escapeHtml(labels.shareOptions)}</span>
                <div class="share-links-row-actions">
                  ${link.emailSupported ? `<button type="button" class="btn-neutral share-links-email-action" data-share-email="${escapeHtml(shareId)}" aria-label="${escapeHtml(labels.mail)}" title="${escapeHtml(labels.mail)}"><span class="share-links-row-mail-icon" aria-hidden="true"></span></button>` : ""}
                  ${renderQuickShareActions(link, labels)}
                </div>
              </div>`
              }
            </article>
          `;
          })
          .join("")}
    </div>
  `;
}

function renderBody(labels, state) {
    const activeModule = state.methodModules.get(state.activeMethodId);
    const emptyLabel = activeModule?.getEmptyLabel?.(labels) ?? labels.empty;
    return `
    <section class="share-links-popup">
      <nav class="share-method-tabs" aria-label="${escapeHtml(labels.methods || "Share methods")}">
        ${state.methods.map((method) => `<button type="button" class="share-method-tab${method.id === state.activeMethodId ? " is-active" : ""}" data-share-method="${escapeHtml(method.id)}" aria-pressed="${method.id === state.activeMethodId ? "true" : "false"}">${escapeHtml(method.name)}</button>`).join("")}
      </nav>
      <p class="share-method-description"></p>
      <div class="share-method-page"></div>
          <h3 class="share-method-history-heading"></h3>
          <div class="share-links-list-container">
        ${renderRows({ ...labels, empty: emptyLabel }, state.visibleLinks)}
      </div>
    </section>
  `;
}

function renderPasswordProtectionField(labels, state) {
    const formMarkup = createFormBuilder(
        {
            i18n: {
                t: () => labels.password,
            },
            escapeHtml,
            renderInfoTooltip,
        },
        {
            formId: "share-links-password-form",
            includeSubmitButton: false,
            submitLabelKey: "ui.reuse.save",
            fields: [
                {
                    name: "password",
                    labelKey: "password",
                    type: "password",
                    required: state.passwordRequired,
                    infoTooltip:
                        state.passwordRequired &&
                        state.activeMethodId === "link"
                            ? {
                                  text: labels.passwordRequiredInfo,
                                  ariaLabel: labels.moreInformation,
                                  id: "share-password-required",
                              }
                            : undefined,
                    value: state.password,
                    attributes: {
                        autocomplete: "new-password",
                        placeholder: labels.passwordPlaceholder,
                    },
                },
            ],
        },
    ).render();
    return `<div class="share-links-password-row">${formMarkup}<button type="button" class="btn-neutral btn-animated share-links-password-generate" data-share-generate-password aria-label="${escapeHtml(labels.generatePassword)}" title="${escapeHtml(labels.generatePassword)}"><span aria-hidden="true">&#8635;</span></button></div>`;
}

async function showSharePasswordPopup(password, labels) {
    const normalizedPassword = String(password ?? "");
    if (!normalizedPassword) return;
    await openPopup({
        title: labels.passwordPopupTitle || labels.password,
        body: () =>
            `<div class="share-password-result">${renderSecretVisibilityField({ id: "created-share-password", value: normalizedPassword, label: labels.passwordPopupLabel || labels.password, toggleLabel: labels.passwordReveal, escapeHtml })}<button type="button" class="btn-confirm" data-share-password-copy>${escapeHtml(labels.passwordCopy || labels.copyLink)}</button></div>`,
        actions: [{ id: "done", label: labels.done, variant: "confirm" }],
        onOpen(overlay) {
            bindSecretVisibilityToggles({ root: overlay });
            overlay
                .querySelector("[data-share-password-copy]")
                ?.addEventListener("click", async () => {
                    const copied =
                        await copyTextToClipboard(normalizedPassword);
                    showToast(
                        copied ? labels.passwordCopied : labels.copyFailed,
                        { variant: copied ? "success" : "error" },
                    );
                });
        },
    });
}

function generateSharePassword() {
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789_-";
    const characters = [];
    const randomValues = new Uint8Array(32);
    while (characters.length < 20) {
        crypto.getRandomValues(randomValues);
        for (const value of randomValues) {
            if (value >= 228) continue;
            characters.push(alphabet[value % alphabet.length]);
            if (characters.length === 20) break;
        }
    }
    return Array.from({ length: 5 }, (_, index) =>
        characters.slice(index * 4, index * 4 + 4).join(""),
    ).join("-");
}

export async function openShareLinksPopup({
    title,
    labels,
    fetchLinks,
    createLink,
    deleteLink,
    updateLink,
    searchUsers,
    fetchMethods,
    linkAccessOptions = [],
    passwordRequired = false,
    defaultGrantedCapabilities = [],
}) {
    await ensureStylesheet();

    const state = {
        isCreating: false,
        links: [],
        pendingLinks: new Map(),
        editingShareId: "",
        label: "",
        expiresAt: "",
        password: "",
        passwordRequired,
        defaultGrantedCapabilities,
        recipients: [],
        methods: [],
        methodModules: new Map(),
        activeMethodId: "link",
        visibleLinks: [],
        permission: "read",
        linkAccessOptions: Array.isArray(linkAccessOptions)
            ? linkAccessOptions
            : [],
        linkAccessId: String(linkAccessOptions?.[0]?.id ?? ""),
    };

    try {
        state.methods =
            typeof fetchMethods === "function" ? await fetchMethods() : [];
    } catch {
        state.methods = [];
    }
    if (state.methods.length === 0) {
        state.methods = [
            { id: "link", name: labels.linkMethod || "Link" },
            { id: "user", name: labels.userMethod || "User" },
        ];
    }
    for (const method of state.methods) {
        if (!method?.pageModuleUrl) continue;
        try {
            state.methodModules.set(
                method.id,
                await import(method.pageModuleUrl),
            );
        } catch {
            // A broken adapter page is isolated from the remaining methods.
        }
    }
    if (!state.methods.some((method) => method.id === state.activeMethodId)) {
        state.activeMethodId = state.methods[0]?.id || "link";
    }

    function filterLinksForActiveMethod() {
        const methodModule = state.methodModules.get(state.activeMethodId);
        if (typeof methodModule?.acceptsShare === "function") {
            state.visibleLinks = state.links.filter((link) =>
                methodModule.acceptsShare(link),
            );
            return;
        }
        state.visibleLinks = state.links.filter((link) => {
            const hasUsers =
                Array.isArray(link?.accessControls?.recipients) &&
                link.accessControls.recipients.some(
                    (entry) => entry?.type === "user",
                );
            return state.activeMethodId === "user" ? hasUsers : !hasUsers;
        });
    }

    async function refreshLinks({ preserveOnError = true } = {}) {
        try {
            const fetchedLinks = await fetchLinks();
            const fetchedIds = new Set(
                fetchedLinks.map((link) => String(link.id)),
            );
            for (const shareId of fetchedIds) {
                state.pendingLinks.delete(shareId);
            }
            state.links = [...state.pendingLinks.values(), ...fetchedLinks];
            filterLinksForActiveMethod();
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
        listContainer.innerHTML = renderRows(
            {
                ...labels,
                empty:
                    state.methodModules
                        .get(state.activeMethodId)
                        ?.getEmptyLabel?.(labels) ?? labels.empty,
            },
            state.visibleLinks,
        );
        hydrateRecipientAvatars(listContainer);
    }

    function syncCreateButton(createButton) {
        if (!(createButton instanceof HTMLButtonElement)) {
            return;
        }
        createButton.disabled = state.isCreating;
        if (state.activeMethodId === "user") {
            createButton.textContent = state.editingShareId
                ? labels.updateUserShare || "Update User Share"
                : `${labels.shareWithPrefix || "Share with"} ${state.recipients.length} ${labels.usersCountLabel || "users"}`;
        }
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
            const methodTabs = overlay.querySelector(".share-method-tabs");
            const methodPage = overlay.querySelector(".share-method-page");
            const methodDescription = overlay.querySelector(
                ".share-method-description",
            );
            const historyHeading = overlay.querySelector(
                ".share-method-history-heading",
            );
            const listContainer = overlay.querySelector(
                ".share-links-list-container",
            );
            if (
                !(methodPage instanceof HTMLElement) ||
                !(listContainer instanceof HTMLElement)
            ) {
                return;
            }

            popupOpen = true;
            hydrateRecipientAvatars(overlay);
            let searchSequence = 0;

            const renderSelectedUsers = () => {
                const selectedUsers = methodPage.querySelector(
                    ".share-links-selected-users",
                );
                if (!(selectedUsers instanceof HTMLElement)) return;
                selectedUsers.innerHTML = state.recipients
                    .map(
                        (recipient) =>
                            `<span class="share-links-recipient-chip">${buildRecipientAvatarMarkup({ avatarKey: recipient.avatarKey || null, label: recipient.label || recipient.id, colorSeed: recipient.id, profileHandle: recipient.handle || null, avatarClass: "share-links-user-avatar", imageClass: "share-links-user-avatar-image", fallbackClass: "share-links-user-avatar-fallback" })}<span>${escapeHtml(recipient.label || recipient.id)}</span><small>${escapeHtml(recipient.permissions?.includes("write") ? labels.writePermission || "Write" : labels.readPermission || "Read")}</small><button type="button" data-selected-recipient-remove="${escapeHtml(recipient.id)}">×</button></span>`,
                    )
                    .join("");
                hydrateRecipientAvatars(selectedUsers);
                syncCreateButton(
                    methodPage.querySelector("#share-links-create-btn"),
                );
            };

            const renderMethodPage = () => {
                const activeMethod = state.methods.find(
                    (method) => method.id === state.activeMethodId,
                );
                const methodModule = state.methodModules.get(
                    state.activeMethodId,
                );
                methodTabs
                    ?.querySelectorAll("[data-share-method]")
                    .forEach((button) => {
                        const active =
                            button.getAttribute("data-share-method") ===
                            state.activeMethodId;
                        button.classList.toggle("is-active", active);
                        button.setAttribute(
                            "aria-pressed",
                            active ? "true" : "false",
                        );
                    });
                methodDescription.textContent = String(
                    activeMethod?.description ?? "",
                );
                historyHeading.textContent = String(activeMethod?.name ?? "");
                methodPage.innerHTML =
                    typeof methodModule?.renderPage === "function"
                        ? methodModule.renderPage({
                              labels,
                              state,
                              escapeHtml,
                              gatewayFields: {
                                  password: renderPasswordProtectionField(
                                      labels,
                                      state,
                                  ),
                              },
                          })
                        : `<p class="share-links-empty">${escapeHtml(labels.methodUnavailable || labels.createFailed)}</p>`;
                renderSelectedUsers();
                filterLinksForActiveMethod();
                renderLinksList(listContainer);
            };

            const createCurrentShare = async () => {
                if (state.isCreating) return;
                const passwordForm = methodPage.querySelector(
                    "#share-links-password-form",
                );
                if (
                    (state.activeMethodId === "link" ||
                        state.activeMethodId === "user") &&
                    passwordForm instanceof HTMLFormElement &&
                    !passwordForm.reportValidity()
                ) {
                    return;
                }
                const createButton = methodPage.querySelector(
                    "#share-links-create-btn",
                );
                state.isCreating = true;
                syncCreateButton(createButton);
                let shareUrl = null;
                let revealedPassword = "";
                try {
                    const createInput = {
                        label: state.label,
                        expiresAt: state.expiresAt
                            ? new Date(state.expiresAt).toISOString()
                            : "",
                        password: state.password,
                        recipients: state.recipients,
                        shareMethod: state.activeMethodId,
                        permission: state.permission,
                        selectedAccess: state.linkAccessOptions.find(
                            (option) => option.id === state.linkAccessId,
                        ),
                        defaultGrantedCapabilities:
                            state.defaultGrantedCapabilities,
                    };
                    const methodModule = state.methodModules.get(
                        state.activeMethodId,
                    );
                    const preparedInput =
                        typeof methodModule?.buildCreateOptions === "function"
                            ? methodModule.buildCreateOptions(createInput)
                            : createInput;
                    const result = state.editingShareId
                        ? await updateLink({
                              shareId: state.editingShareId,
                              ...preparedInput,
                          })
                        : await createLink(preparedInput);
                    if (typeof methodModule?.afterCreate === "function") {
                        await methodModule.afterCreate({ result });
                    }
                    revealedPassword = String(
                        state.password || result?.generatedPassword || "",
                    );
                    if (result?.id) {
                        state.pendingLinks.set(String(result.id), result);
                        state.links = [
                            result,
                            ...state.links.filter(
                                (link) => String(link.id) !== String(result.id),
                            ),
                        ];
                        filterLinksForActiveMethod();
                    }
                    shareUrl =
                        state.activeMethodId === "link"
                            ? (result?.shareUrl ?? null)
                            : null;
                    state.label = "";
                    state.password = "";
                    state.recipients = [];
                    state.editingShareId = "";
                    if (popupOpen) renderMethodPage();
                    await refreshLinks();
                    if (popupOpen) renderLinksList(listContainer);
                } catch (error) {
                    showToast(
                        error?.code === "duplicate_user_share"
                            ? labels.duplicateUserShare || labels.createFailed
                            : labels.createFailed,
                        { variant: "error" },
                    );
                } finally {
                    state.isCreating = false;
                    syncCreateButton(
                        methodPage.querySelector("#share-links-create-btn"),
                    );
                }
                if (shareUrl) {
                    copyTextToClipboard(String(shareUrl)).then((copied) => {
                        showToast(
                            copied ? labels.copySuccess : labels.copyFailed,
                            { variant: copied ? "success" : "error" },
                        );
                    });
                }
                if (revealedPassword) {
                    await showSharePasswordPopup(revealedPassword, labels);
                }
            };

            const clearEditMode = () => {
                state.editingShareId = "";
                state.label = "";
                state.expiresAt = "";
                state.password = "";
                state.recipients = [];
                state.permission = "read";
                state.linkAccessId = String(
                    state.linkAccessOptions?.[0]?.id ?? "",
                );
                renderMethodPage();
            };

            methodTabs?.addEventListener("click", (event) => {
                const button = event.target.closest("[data-share-method]");
                if (!(button instanceof HTMLElement)) return;
                state.activeMethodId = String(
                    button.dataset.shareMethod || "link",
                );
                renderMethodPage();
            });

            methodPage.addEventListener("input", (event) => {
                const target = event.target;
                if (!(target instanceof HTMLInputElement)) return;
                if (target.id === "share-links-label") {
                    state.label = target.value;
                    return;
                }
                if (target.id === "share-links-expiry") {
                    state.expiresAt = target.value;
                    return;
                }
                if (target.id === "form-builder-password") {
                    state.password = target.value;
                    return;
                }
                if (target.id !== "share-links-user-search") return;
                const sequence = ++searchSequence;
                void searchUsers(target.value)
                    .catch(() => [])
                    .then((users) => {
                        if (sequence !== searchSequence || !target.isConnected)
                            return;
                        const results = methodPage.querySelector(
                            ".share-links-user-results",
                        );
                        if (!(results instanceof HTMLElement)) return;
                        results.innerHTML = users
                            .filter(
                                (user) =>
                                    !state.recipients.some(
                                        (entry) => entry.id === user.id,
                                    ),
                            )
                            .map(
                                (user) =>
                                    `<div class="share-links-user-result" role="button" tabindex="0" data-share-user-id="${escapeHtml(user.id)}" data-share-user-label="${escapeHtml(user.label || user.handle || user.id)}" data-share-user-handle="${escapeHtml(user.handle || "")}" data-share-user-avatar-key="${escapeHtml(user.avatarKey || "")}">${buildRecipientAvatarMarkup({ avatarKey: user.avatarKey || null, label: user.label || user.id, colorSeed: user.id, profileHandle: user.handle || null, avatarClass: "share-links-user-avatar", imageClass: "share-links-user-avatar-image", fallbackClass: "share-links-user-avatar-fallback" })}<span>${escapeHtml(user.label || user.id)}</span></div>`,
                            )
                            .join("");
                        hydrateRecipientAvatars(results);
                    });
            });

            methodPage.addEventListener("change", (event) => {
                const target = event.target;
                if (
                    target instanceof HTMLSelectElement &&
                    target.id === "share-links-user-permission"
                ) {
                    state.permission =
                        target.value === "write" ? "write" : "read";
                    state.recipients = state.recipients.map((recipient) => ({
                        ...recipient,
                        permissions:
                            state.permission === "write"
                                ? ["read", "write"]
                                : ["read"],
                    }));
                    renderSelectedUsers();
                } else if (
                    target instanceof HTMLSelectElement &&
                    target.id === "share-links-access-mode"
                ) {
                    state.linkAccessId = target.value;
                }
            });

            methodPage.addEventListener("click", (event) => {
                const target = event.target;
                if (!(target instanceof HTMLElement)) return;
                if (target.closest("[data-share-generate-password]")) {
                    state.password = generateSharePassword();
                    const passwordInput = methodPage.querySelector(
                        "#form-builder-password",
                    );
                    if (passwordInput instanceof HTMLInputElement) {
                        passwordInput.value = state.password;
                        passwordInput.focus();
                    }
                    return;
                }
                if (target.closest("[data-share-cancel-edit]")) {
                    clearEditMode();
                    return;
                }
                const activeModule = state.methodModules.get(
                    state.activeMethodId,
                );
                if (
                    typeof activeModule?.handleClick === "function" &&
                    activeModule.handleClick({
                        target,
                        page: methodPage,
                        escapeHtml,
                    })
                )
                    return;
                if (target.closest("#share-links-create-btn")) {
                    void createCurrentShare();
                    return;
                }
                const userButton = target.closest("[data-share-user-id]");
                if (userButton instanceof HTMLElement) {
                    if (target.closest('a[href^="/profile/"]')) return;
                    state.recipients.push({
                        type: "user",
                        id: userButton.dataset.shareUserId,
                        label: userButton.dataset.shareUserLabel,
                        handle: userButton.dataset.shareUserHandle,
                        avatarKey: userButton.dataset.shareUserAvatarKey,
                        permissions:
                            state.permission === "write"
                                ? ["read", "write"]
                                : ["read"],
                    });
                    const search = methodPage.querySelector(
                        "#share-links-user-search",
                    );
                    if (search instanceof HTMLInputElement) search.value = "";
                    const results = methodPage.querySelector(
                        ".share-links-user-results",
                    );
                    if (results instanceof HTMLElement) results.innerHTML = "";
                    renderSelectedUsers();
                    return;
                }
                const removeButton = target.closest(
                    "[data-selected-recipient-remove]",
                );
                if (removeButton instanceof HTMLElement) {
                    state.recipients = state.recipients.filter(
                        (entry) =>
                            entry.id !==
                            removeButton.dataset.selectedRecipientRemove,
                    );
                    renderSelectedUsers();
                }
            });

            methodPage.addEventListener("keydown", (event) => {
                const activeModule = state.methodModules.get(
                    state.activeMethodId,
                );
                activeModule?.handleKeydown?.({
                    event,
                    page: methodPage,
                    escapeHtml,
                });
            });

            listContainer.addEventListener("click", async (event) => {
                if (!(event.target instanceof HTMLElement)) return;
                const emailButton = event.target.closest("[data-share-email]");
                if (emailButton instanceof HTMLElement) {
                    const selectedShare = state.links.find(
                        (link) =>
                            String(link.id) === emailButton.dataset.shareEmail,
                    );
                    const linkModule = state.methodModules.get("link");
                    if (
                        selectedShare &&
                        typeof linkModule?.openEmailPopup === "function"
                    ) {
                        void linkModule.openEmailPopup({
                            share: selectedShare,
                            labels,
                            escapeHtml,
                        });
                    }
                    return;
                }
                const editRow = event.target.closest("[data-share-edit]");
                if (
                    editRow instanceof HTMLElement &&
                    !event.target.closest(
                        "[data-share-delete],[data-share-copy]",
                    )
                ) {
                    const selectedShare = state.links.find(
                        (link) => String(link.id) === editRow.dataset.shareEdit,
                    );
                    if (selectedShare) {
                        const hasUserRecipients = Array.isArray(
                            selectedShare.accessControls?.recipients,
                        )
                            ? selectedShare.accessControls.recipients.some(
                                  (recipient) => recipient?.type === "user",
                              )
                            : false;
                        state.activeMethodId = hasUserRecipients
                            ? "user"
                            : "link";
                        state.editingShareId = String(selectedShare.id);
                        state.label = String(selectedShare.label ?? "");
                        state.expiresAt = selectedShare.expiresAt
                            ? new Date(selectedShare.expiresAt)
                                  .toISOString()
                                  .slice(0, 16)
                            : "";
                        state.recipients = Array.isArray(
                            selectedShare.accessControls?.recipients,
                        )
                            ? selectedShare.accessControls.recipients
                            : [];
                        state.permission =
                            selectedShare.accessControls?.permissions?.includes(
                                "write",
                            )
                                ? "write"
                                : "read";
                        const matchingAccess = state.linkAccessOptions.find(
                            (option) =>
                                option.grantedCapabilities?.every(
                                    (capability) =>
                                        selectedShare.grantedCapabilities?.includes(
                                            capability,
                                        ),
                                ),
                        );
                        if (matchingAccess) {
                            state.linkAccessId = matchingAccess.id;
                        }
                        renderMethodPage();
                    }
                    return;
                }
                const copyButton = event.target.closest("[data-share-copy]");
                if (copyButton instanceof HTMLElement) {
                    const shareUrl = String(
                        copyButton.getAttribute("data-share-copy") ?? "",
                    );
                    if (!shareUrl) return;
                    void copyTextToClipboard(shareUrl).then((copied) =>
                        showToast(
                            copied ? labels.copySuccess : labels.copyFailed,
                            { variant: copied ? "success" : "error" },
                        ),
                    );
                    return;
                }
                const deleteButton = event.target.closest(
                    "[data-share-delete]",
                );
                if (!(deleteButton instanceof HTMLElement)) return;
                const shareId = String(
                    deleteButton.getAttribute("data-share-delete") ?? "",
                );
                if (!shareId) return;
                const confirmation = await openPopup({
                    title: labels.deleteConfirmTitle || labels.revoke,
                    body: `<p>${escapeHtml(labels.deleteConfirmMessage || labels.revoke)}</p>`,
                    actions: [
                        {
                            id: "confirm",
                            label: labels.confirm || labels.revoke,
                            variant: "danger",
                        },
                        {
                            id: "cancel",
                            label: labels.cancel || labels.done,
                            variant: "cancel",
                        },
                    ],
                });
                if (confirmation !== "confirm") return;
                void deleteLink({ shareId })
                    .then(async () => {
                        state.pendingLinks.delete(shareId);
                        await refreshLinks();
                        if (popupOpen) renderLinksList(listContainer);
                    })
                    .catch(() =>
                        showToast(labels.deleteFailed, { variant: "error" }),
                    );
            });

            renderMethodPage();
            refreshTimer = window.setInterval(() => {
                void refreshLinks().then(() => {
                    if (popupOpen) renderLinksList(listContainer);
                });
            }, SHARE_LINKS_REFRESH_INTERVAL_MS);
        },
    });

    popupOpen = false;
    if (refreshTimer !== null) {
        clearInterval(refreshTimer);
    }
}
