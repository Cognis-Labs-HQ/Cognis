/** Cognis user sharing method page behavior. */
export function acceptsShare(share) {
    return (
        Array.isArray(share?.accessControls?.recipients) &&
        share.accessControls.recipients.some((entry) => entry?.type === "user")
    );
}

export function buildCreateOptions(input) {
    const defaultCapabilities = Array.isArray(input.defaultGrantedCapabilities)
        ? input.defaultGrantedCapabilities
        : [];
    return {
        ...input,
        recipients: input.recipients || [],
        grantedCapabilities:
            input.permission === "write"
                ? defaultCapabilities
                : defaultCapabilities.filter(
                      (capability) => !String(capability).endsWith(":write"),
                  ),
        accessControls: {
            permissions:
                input.permission === "write" ? ["read", "write"] : ["read"],
            recipients: input.recipients || [],
        },
    };
}

export function getEmptyLabel(labels) {
    return labels.userEmpty || labels.empty;
}

export function renderPage({ labels, state, escapeHtml }) {
    return `<div class="share-links-create-form share-links-user-picker" data-share-page="user">
      <label><span>${escapeHtml(labels.users || "Share with people")}</span><input id="share-links-user-search" type="search" autocomplete="off" placeholder="${escapeHtml(labels.userSearchPlaceholder || "Search people…")}" /></label>
      <div class="share-links-user-results"></div>
      <div class="share-links-selected-users"></div>
      <label><span>${escapeHtml(labels.permission || "Permission")}</span><select id="share-links-user-permission"><option value="read"${state.permission === "read" ? " selected" : ""}>${escapeHtml(labels.readPermission || "Read")}</option><option value="write"${state.permission === "write" ? " selected" : ""}>${escapeHtml(labels.writePermission || "Write")}</option></select></label>
      <label><span>${escapeHtml(labels.expiryLabel)}</span><input id="share-links-expiry" type="datetime-local" value="${escapeHtml(state.expiresAt)}" /></label>
      <div class="share-links-form-actions"><button id="share-links-create-btn" class="btn-confirm btn-animated" type="button">${escapeHtml(state.editingShareId ? labels.updateUserShare || "Update User Share" : `${labels.shareWithPrefix || "Share with"} ${state.recipients.length} ${labels.usersCountLabel || "users"}`)}</button>${state.editingShareId ? `<button type="button" class="btn-cancel" data-share-cancel-edit aria-label="${escapeHtml(labels.cancel)}">×</button>` : ""}</div>
    </div>`;
}
