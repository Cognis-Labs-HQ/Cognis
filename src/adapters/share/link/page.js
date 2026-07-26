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

export function renderPage({ labels, state, escapeHtml }) {
    return `<div class="share-links-create-form" data-share-page="link">
      <label><span>${escapeHtml(labels.label)}</span><input id="share-links-label" type="text" value="${escapeHtml(state.label)}" placeholder="${escapeHtml(labels.labelPlaceholder)}" /></label>
      <label><span>${escapeHtml(labels.expiryLabel)}</span><input id="share-links-expiry" type="number" min="1" step="1" value="${escapeHtml(state.expiresInHours)}" placeholder="24" /></label>
      <button id="share-links-create-btn" class="btn-confirm btn-animated" type="button">${escapeHtml(labels.generateLink)}</button>
    </div>`;
}
