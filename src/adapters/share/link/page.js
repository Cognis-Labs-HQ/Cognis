/** Link sharing method page behavior. */
import { apiFetch } from "/static/reuse/api-client.js";

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
                  },
              }
            : {}),
    };
}

export function getEmptyLabel(labels) {
    return labels.empty;
}

export async function afterCreate({ result }) {
    if (!result?.id || emailRecipients.length === 0) return;
    const response = await apiFetch(
        `/api/v1/share/tokens/${encodeURIComponent(result.id)}/email`,
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ recipients: emailRecipients }),
        },
    );
    if (!response.ok) throw new Error("share_email_failed");
    emailRecipients = [];
}

export function handleKeydown({ event, page, escapeHtml }) {
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

export function handleClick({ target, page, escapeHtml }) {
    const remove = target.closest("[data-share-email-remove]");
    if (!(remove instanceof HTMLElement)) return false;
    emailRecipients = emailRecipients.filter(
        (email) => email !== remove.dataset.shareEmailRemove,
    );
    page.querySelector(".share-email-tags").innerHTML =
        renderEmailTags(escapeHtml);
    return true;
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
      <label><span>${escapeHtml(labels.emailRecipients || "Email recipients")}</span><input id="share-email-input" type="email" autocomplete="email" placeholder="${escapeHtml(labels.emailRecipientsPlaceholder || "Type an email and press Enter")}" /></label>
      <div class="share-email-tags">${renderEmailTags(escapeHtml)}</div>
      <button id="share-links-create-btn" class="btn-confirm btn-animated" type="button">${escapeHtml(labels.generateLink)}</button>
    </div>`;
}
