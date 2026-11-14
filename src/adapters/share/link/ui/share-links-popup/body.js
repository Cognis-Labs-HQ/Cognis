export function renderPopupBody({
    labels,
    state,
    editOnly,
    escapeHtml,
    renderRows,
}) {
    const activeModule = state.methodModules.get(state.activeMethodId);
    const emptyLabel = activeModule?.getEmptyLabel?.(labels) ?? labels.empty;
    const methodTabs = editOnly
        ? ""
        : `<nav class="share-method-tabs" aria-label="${escapeHtml(labels.methods || "Share methods")}">
        ${state.methods.map((method) => `<button type="button" class="share-method-tab${method.id === state.activeMethodId ? " is-active" : ""}" data-share-method="${escapeHtml(method.id)}" aria-pressed="${method.id === state.activeMethodId ? "true" : "false"}">${escapeHtml(method.name)}</button>`).join("")}
      </nav>`;
    const history = editOnly
        ? ""
        : `<h3 class="share-method-history-heading"></h3>
      <div class="share-links-list-container">
        ${renderRows({ ...labels, hidePermissionLabels: !state.supportsReadOnly, empty: emptyLabel }, state.visibleLinks)}
      </div>`;
    return `
    <section class="share-links-popup${editOnly ? " share-links-popup--edit-only" : ""}">
      ${methodTabs}
      ${editOnly ? "" : '<p class="share-method-description"></p>'}
      <div class="share-method-page"></div>
      ${history}
    </section>
  `;
}

export function resolveShareMethodId(share) {
    const recipients = Array.isArray(share?.accessControls?.recipients)
        ? share.accessControls.recipients
        : [];
    return recipients.some((recipient) => recipient?.type === "user")
        ? "user"
        : "link";
}
