/**
 * Implements the Share gateway popup lifecycle and rendering.
 *
 * Public exports:
 *   openShareLinksPopup(options) — renders and manages a share popup.
 *
 * Usage:
 *   import { openShareLinksPopup } from "./implementation.js";
 *   await openShareLinksPopup(options);
 *
 * @param {object} options Share popup callbacks, labels, and defaults.
 * @returns {Promise<void>} Resolves after the popup closes.
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
import { renderPopupBody, resolveShareMethodId } from "./body.js";
import {
    buildRecipientAvatarMarkup,
    ensureStylesheet,
    generateSharePassword,
    hydrateRecipientAvatars,
    renderPasswordProtectionField,
    renderQuickShareActions,
    renderRows,
    renderShareStatus,
    showSharePasswordPopup,
} from "./rendering.js";

const SHARE_LINKS_REFRESH_INTERVAL_MS = 10_000;

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
    supportsReadOnly = false,
    initialEditingShareId = "",
    initialEditingShare = null,
    editOnly = false,
    allowedMethodIds = null,
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
        permission: supportsReadOnly ? "read" : "write",
        supportsReadOnly,
        linkAccessOptions: Array.isArray(linkAccessOptions)
            ? linkAccessOptions.filter(
                  (option) =>
                      supportsReadOnly ||
                      option?.permissions?.includes("write"),
              )
            : [],
        linkAccessId: String(
            linkAccessOptions.find(
                (option) =>
                    supportsReadOnly || option?.permissions?.includes("write"),
            )?.id ?? "",
        ),
    };
    const initialShare =
        initialEditingShare && typeof initialEditingShare === "object"
            ? initialEditingShare
            : null;
    if (initialShare) {
        state.activeMethodId = resolveShareMethodId(initialShare);
    }

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
    if (Array.isArray(allowedMethodIds)) {
        const allowedMethods = new Set(allowedMethodIds.map(String));
        state.methods = state.methods.filter((method) =>
            allowedMethods.has(String(method?.id ?? "")),
        );
    }
    if (editOnly) {
        state.methods = state.methods.filter(
            (method) => method.id === state.activeMethodId,
        );
    }
    for (const method of state.methods) {
        if (!method?.pageModuleUrl) continue;
        try {
            const methodModule = await import(method.pageModuleUrl);
            state.methodModules.set(method.id, methodModule);
            if (typeof methodModule.getMetadata === "function") {
                Object.assign(method, await methodModule.getMetadata());
            }
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

    function selectShareForEditing(selectedShare) {
        if (!selectedShare) return false;
        const recipients = Array.isArray(
            selectedShare.accessControls?.recipients,
        )
            ? selectedShare.accessControls.recipients
            : [];
        state.activeMethodId = recipients.some(
            (recipient) => recipient?.type === "user",
        )
            ? "user"
            : "link";
        state.editingShareId = String(selectedShare.id ?? "");
        state.label = String(selectedShare.label ?? "");
        state.expiresAt = selectedShare.expiresAt
            ? new Date(selectedShare.expiresAt).toISOString().slice(0, 16)
            : "";
        state.recipients = recipients;
        state.permission = state.supportsReadOnly
            ? selectedShare.accessControls?.permissions?.includes("write")
                ? "write"
                : "read"
            : "write";
        const matchingAccess = state.linkAccessOptions.find(
            (option) =>
                option.grantedCapabilities?.length ===
                    selectedShare.grantedCapabilities?.length &&
                option.grantedCapabilities.every((capability) =>
                    selectedShare.grantedCapabilities.includes(capability),
                ),
        );
        if (matchingAccess) state.linkAccessId = matchingAccess.id;
        return true;
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
                hidePermissionLabels: !state.supportsReadOnly,
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

    if (editOnly && initialShare) {
        state.links = [initialShare];
        selectShareForEditing(initialShare);
        filterLinksForActiveMethod();
    } else {
        await refreshLinks({ preserveOnError: false });
        selectShareForEditing(
            state.links.find(
                (share) => String(share.id) === String(initialEditingShareId),
            ),
        );
    }

    let refreshTimer = null;
    let popupOpen = false;

    await openPopup({
        title,
        body: () =>
            renderPopupBody({
                labels,
                state,
                editOnly,
                escapeHtml,
                renderRows,
            }),
        actions: [
            {
                id: "done",
                label: labels.close || labels.done || "Close",
                variant: "neutral",
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
                (!editOnly && !(listContainer instanceof HTMLElement))
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
                            `<span class="share-links-recipient-chip">${buildRecipientAvatarMarkup({ avatarKey: recipient.avatarKey || null, label: recipient.label || recipient.id, colorSeed: recipient.id, profileHandle: recipient.handle || null, avatarClass: "share-links-user-avatar", imageClass: "share-links-user-avatar-image", fallbackClass: "share-links-user-avatar-fallback" })}<span>${escapeHtml(recipient.label || recipient.id)}</span>${state.supportsReadOnly ? `<small>${escapeHtml(recipient.permissions?.includes("write") ? labels.writePermission || "Write" : labels.readPermission || "Read")}</small>` : ""}<button type="button" data-selected-recipient-remove="${escapeHtml(recipient.id)}">×</button></span>`,
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
                if (methodDescription instanceof HTMLElement) {
                    methodDescription.textContent = String(
                        activeMethod?.description ?? "",
                    );
                }
                if (historyHeading instanceof HTMLElement) {
                    historyHeading.textContent = String(
                        activeMethod?.name ?? "",
                    );
                }
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
                if (editOnly) {
                    const updateButton = methodPage.querySelector(
                        "#share-links-create-btn",
                    );
                    updateButton?.classList.remove("btn-neutral", "btn-cancel");
                    updateButton?.classList.add("btn-confirm");
                }
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
                let methodModule = null;
                let preparedInput = null;
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
                        supportsReadOnly: state.supportsReadOnly,
                        selectedAccess:
                            state.linkAccessOptions.find(
                                (option) => option.id === state.linkAccessId,
                            ) ??
                            (state.supportsReadOnly
                                ? undefined
                                : {
                                      permissions: ["read", "write"],
                                      grantedCapabilities:
                                          state.defaultGrantedCapabilities,
                                  }),
                        defaultGrantedCapabilities:
                            state.defaultGrantedCapabilities,
                    };
                    methodModule = state.methodModules.get(
                        state.activeMethodId,
                    );
                    preparedInput =
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
                    if (editOnly && result?.id) {
                        state.pendingLinks.clear();
                        state.links = [result];
                        selectShareForEditing(result);
                        filterLinksForActiveMethod();
                        if (popupOpen) renderMethodPage();
                    } else {
                        state.label = "";
                        state.password = "";
                        state.recipients = [];
                        state.editingShareId = "";
                        if (popupOpen) renderMethodPage();
                        await refreshLinks();
                        if (popupOpen) renderLinksList(listContainer);
                    }
                } catch (error) {
                    if (
                        error?.code === "duplicate_user_share" &&
                        preparedInput &&
                        typeof methodModule?.findExistingShare === "function"
                    ) {
                        const existingShare = methodModule.findExistingShare(
                            state.links,
                            preparedInput,
                        );
                        const hasChanges = methodModule.hasShareChanges?.(
                            existingShare,
                            preparedInput,
                        );
                        if (existingShare && hasChanges) {
                            try {
                                const updatedShare = await updateLink({
                                    shareId: existingShare.id,
                                    ...preparedInput,
                                });
                                showToast(
                                    labels.duplicateUserShareUpdated ||
                                        labels.updateUserShare,
                                    { variant: "success" },
                                );
                                if (updatedShare) {
                                    state.links = [
                                        updatedShare,
                                        ...state.links.filter(
                                            (share) =>
                                                String(share.id) !==
                                                String(updatedShare.id),
                                        ),
                                    ];
                                    filterLinksForActiveMethod();
                                    renderLinksList(listContainer);
                                }
                            } catch (updateError) {
                                console.error(
                                    "[share] failed to update duplicate user share",
                                    updateError,
                                );
                                showToast(labels.createFailed, {
                                    variant: "error",
                                });
                            }
                            return;
                        }
                    }
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
                state.permission = state.supportsReadOnly ? "read" : "write";
                state.linkAccessId = String(
                    state.linkAccessOptions?.[0]?.id ?? "",
                );
                renderMethodPage();
            };

            methodTabs?.addEventListener("click", (event) => {
                const button = event.target.closest("[data-share-method]");
                if (!(button instanceof HTMLElement)) return;
                const selectedMethodId = String(
                    button.dataset.shareMethod || "link",
                );
                if (
                    state.editingShareId &&
                    selectedMethodId !== state.activeMethodId
                ) {
                    state.activeMethodId = selectedMethodId;
                    clearEditMode();
                    return;
                }
                state.activeMethodId = selectedMethodId;
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

            listContainer?.addEventListener("click", async (event) => {
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
                    if (selectShareForEditing(selectedShare))
                        renderMethodPage();
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
                            variant: "cancel",
                        },
                        {
                            id: "cancel",
                            label: labels.cancel || labels.done,
                            variant: "neutral",
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
            if (!editOnly) {
                refreshTimer = window.setInterval(() => {
                    void refreshLinks().then(() => {
                        if (popupOpen) renderLinksList(listContainer);
                    });
                }, SHARE_LINKS_REFRESH_INTERVAL_MS);
            }
        },
    });

    popupOpen = false;
    if (refreshTimer !== null) {
        clearInterval(refreshTimer);
    }
}
