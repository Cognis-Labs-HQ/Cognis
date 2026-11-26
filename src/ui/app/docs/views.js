import { escapeHtml } from "../../reuse/escape-html.js";

export function renderDocumentViews(i18n, active) {
    const buttons = ["info", "usage", "technical"].map(
        (view) =>
            `<button type="button" class="btn-neutral docs-view-button" data-doc-view="${view}" aria-pressed="${active === view}">${escapeHtml(i18n.t(`ui.reuse.${view}`))}</button>`,
    );
    return `<nav class="docs-view-bar" aria-label="${escapeHtml(i18n.t("ui.reuse.docs"))}">${buttons.join("")}</nav>`;
}
