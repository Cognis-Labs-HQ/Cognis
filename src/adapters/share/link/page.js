let metadataI18nPromise = null;

export async function getMetadata() {
    metadataI18nPromise ??= import("/static/reuse/i18n.js").then(
        ({ createI18n }) =>
            createI18n({
                componentStringBaseUrls: [
                    "/static/adapters/share/link/languages",
                ],
            }),
    );
    const metadataI18n = await metadataI18nPromise;
    return {
        name: metadataI18n.t("adapter.share.link.name"),
        description: metadataI18n.t("adapter.share.link.description"),
    };
}

/** Link sharing method page behavior. */
import { apiFetch } from "/static/reuse/api-client.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";

let emailRecipients = [];

function renderEmailTags(escapeHtml) {
    return emailRecipients
        .map(
            (email) =>
                `<span class="share-email-tag">${escapeHtml(email)}<button type="button" data-share-email-remove="${escapeHtml(email)}" aria-label="${escapeHtml(email)}">×</button></span>`,
        )
        .join("");
}
export function acceptsShare(share) {
    return (
        !Array.isArray(share?.accessControls?.recipients) ||
        share.accessControls.recipients.length === 0
    );
}

export function buildCreateOptions(input) {
    return {
        ...input,
        recipients: [],
        ...(input.selectedAccess
            ? {
                  grantedCapabilities: input.selectedAccess.grantedCapabilities,
                  accessControls: {
                      permissions: input.selectedAccess.permissions,
                      recipients: [],
                  },
              }
            : {}),
    };
}

export function getEmptyLabel(labels) {
    return labels.empty;
}

function handleEmailKeydown({ event, page, escapeHtml }) {
    const input = event.target;
    if (
        !(input instanceof HTMLInputElement) ||
        input.id !== "share-email-input"
    )
        return false;
    if (event.key !== "Enter" && event.key !== ",") return false;
    event.preventDefault();
    const email = input.value.trim().replace(/,$/, "").toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailRecipients = Array.from(new Set([...emailRecipients, email]));
        input.value = "";
        page.querySelector(".share-email-tags").innerHTML =
            renderEmailTags(escapeHtml);
    }
    return true;
}

function handleEmailClick({ target, page, escapeHtml }) {
    const remove = target.closest("[data-share-email-remove]");
    if (!(remove instanceof HTMLElement)) return false;
    emailRecipients = emailRecipients.filter(
        (email) => email !== remove.dataset.shareEmailRemove,
    );
    page.querySelector(".share-email-tags").innerHTML =
        renderEmailTags(escapeHtml);
    return true;
}

export async function openEmailPopup({ share, labels, escapeHtml }) {
    emailRecipients = [];
    await openPopup({
        title: labels.mail,
        body: () =>
            `<div class="share-email-popup"><label><span>${escapeHtml(labels.emailRecipients)}</span><input id="share-email-input" type="email" autocomplete="email" placeholder="${escapeHtml(labels.emailRecipientsPlaceholder)}" /></label><div class="share-email-tags"></div></div>`,
        actions: [
            {
                id: "send",
                label: labels.send,
                variant: "confirm",
            },
            {
                id: "cancel",
                label: labels.cancel,
                variant: "cancel",
            },
        ],
        onOpen: (overlay) => {
            overlay.addEventListener("keydown", (event) => {
                handleEmailKeydown({ event, page: overlay, escapeHtml });
            });
            overlay.addEventListener("click", (event) => {
                if (!(event.target instanceof HTMLElement)) return;
                handleEmailClick({
                    target: event.target,
                    page: overlay,
                    escapeHtml,
                });
            });
        },
        onAction: async (actionId) => {
            if (actionId !== "send") return true;
            if (emailRecipients.length === 0) {
                showToast(labels.emailRecipientsRequired, {
                    variant: "warning",
                });
                return false;
            }
            const response = await apiFetch(
                `/api/v1/share/tokens/${encodeURIComponent(share.id)}/email`,
                {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ recipients: emailRecipients }),
                },
            );
            showToast(response.ok ? labels.emailSent : labels.emailFailed, {
                variant: response.ok ? "success" : "error",
            });
            return response.ok;
        },
    });
}

export function renderPage({ labels, state, escapeHtml, gatewayFields }) {
    const accessOptions = Array.isArray(state.linkAccessOptions)
        ? state.linkAccessOptions
        : [];
    const accessControl =
        accessOptions.length > 1
            ? `<label><span>${escapeHtml(labels.accessMode || labels.permission || "Access")}</span><select id="share-links-access-mode">${accessOptions.map((option) => `<option value="${escapeHtml(option.id)}"${option.id === state.linkAccessId ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select></label>`
            : "";
    return `<div class="share-links-create-form" data-share-page="link">
      <label><span>${escapeHtml(labels.label)}</span><input id="share-links-label" type="text" value="${escapeHtml(state.label)}" placeholder="${escapeHtml(labels.labelPlaceholder)}" /></label>
      ${accessControl}
      <label><span>${escapeHtml(labels.expiryLabel)}</span><input id="share-links-expiry" type="datetime-local" value="${escapeHtml(state.expiresAt)}" /></label>
      ${gatewayFields.password}
      <div class="share-links-form-actions"><button id="share-links-create-btn" class="btn-confirm btn-animated" type="button">${escapeHtml(state.editingShareId ? labels.updateLinkShare || "Update Link Share" : labels.createLinkShare || "Create Link Share")}</button>${state.editingShareId ? `<button type="button" class="btn-cancel" data-share-cancel-edit aria-label="${escapeHtml(labels.cancel)}">×</button>` : ""}</div>
    </div>`;
}
