/** Link sharing method page behavior. */
export function acceptsShare(share) {
    return (
        !Array.isArray(share?.accessControls?.recipients) ||
        share.accessControls.recipients.length === 0
    );
}

export function buildCreateOptions(input) {
    return { ...input, recipients: [] };
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
      <button id="share-links-create-btn" class="btn-confirm btn-animated" type="button">${escapeHtml(labels.generateLink)}</button>
    </div>`;
}
