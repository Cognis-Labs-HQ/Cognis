/**
 * Composes consistent collapsible section rows from descriptor payloads.
 *
 * Public exports:
 *   createCollapsibleSectionComposer(options) — creates a renderer for section
 *     descriptor payloads with shared disclosure and action-row markup; its
 *     load method resolves asynchronous payload providers before rendering.
 *
 * Usage:
 *   const composer = createCollapsibleSectionComposer({ escapeHtml });
 *   root.innerHTML = composer.render([{ id: 'privacy', title: 'Privacy', contentHtml: '<p>Policy</p>' }]);
 *
 * Descriptor HTML properties are trusted markup and must be sanitized by the
 * caller when they contain untrusted values.
 *
 * @param {{ escapeHtml?: (value: string) => string }} options
 * @returns {{ render: (payloads: Array<object>) => string, load: (provider: Array<object>|Promise<Array<object>>|(() => Array<object>|Promise<Array<object>>)) => Promise<string> }}
 */
export function createCollapsibleSectionComposer({ escapeHtml } = {}) {
    const escape = escapeHtml ?? ((value) => String(value));

    function render(payloads = []) {
        return payloads
            .map((payload) => {
                const id = escape(String(payload.id ?? ""));
                const titleMarkup =
                    payload.titleHtml ?? escape(String(payload.title ?? ""));
                const classes = [payload.className, "collapsible-section"]
                    .filter(Boolean)
                    .join(" ");
                const attributes = payload.attributesHtml
                    ? ` ${payload.attributesHtml}`
                    : "";
                const controls = payload.controlsHtml
                    ? `<div class="collapsible-section-action-row ${payload.controlsClassName ?? ""}">${payload.controlsHtml}</div>`
                    : "";
                return `<details class="${classes}" data-collapsible-section="${id}"${payload.open ? " open" : ""}${attributes}>
                    <summary class="${payload.summaryClassName ?? ""} collapsible-section-summary">
                        <span class="collapsible-section-title">${titleMarkup}</span>
                        ${controls}
                        <span class="module-chevron collapsible-section-chevron" role="button" tabindex="0" data-details-toggle aria-label="${escape(String(payload.detailsLabel ?? "Details"))}">▾</span>
                    </summary>
                    <div class="collapsible-section-content ${payload.contentClassName ?? ""}">${payload.contentHtml ?? ""}</div>
                </details>`;
            })
            .join("");
    }

    async function load(provider) {
        const payloads =
            typeof provider === "function" ? await provider() : await provider;
        return render(Array.isArray(payloads) ? payloads : []);
    }

    return { render, load };
}
