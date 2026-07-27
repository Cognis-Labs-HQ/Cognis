/** Cognis user sharing method page behavior. */
export function acceptsShare(share) {
    return (
        Array.isArray(share?.accessControls?.recipients) &&
        share.accessControls.recipients.some((entry) => entry?.type === "user")
    );
}

export function buildCreateOptions(input) {
    return {
        ...input,
        recipients: input.recipients || [],
        accessControls: {
            permissions:
                input.permission === "write" ? ["read", "write"] : ["read"],
        },
    };
}

export function getEmptyLabel(labels) {
    return labels.userEmpty || labels.empty;
}

export function renderPage({ labels, state, escapeHtml, gatewayFields }) {
    return `<div class="share-links-create-form share-links-user-picker" data-share-page="user">
      <label><span>${escapeHtml(labels.users || "Share with people")}</span><input id="share-links-user-search" type="search" autocomplete="off" placeholder="${escapeHtml(labels.userSearchPlaceholder || "Search people…")}" /></label>
      <div class="share-links-user-results"></div>
      <label><span>${escapeHtml(labels.permission || "Permission")}</span><select id="share-links-user-permission"><option value="read"${state.permission === "read" ? " selected" : ""}>${escapeHtml(labels.readPermission || "Read")}</option><option value="write"${state.permission === "write" ? " selected" : ""}>${escapeHtml(labels.writePermission || "Write")}</option></select></label>
      <label><span>${escapeHtml(labels.expiryLabel)}</span><input id="share-links-expiry" type="datetime-local" value="${escapeHtml(state.expiresAt)}" /></label>
      ${gatewayFields.password}
      <div class="share-links-selected-users"></div>
      <button id="share-links-create-btn" class="btn-confirm btn-animated" type="button">${escapeHtml(labels.shareWithUsers || labels.users || "Share")}</button>
    </div>`;
}
