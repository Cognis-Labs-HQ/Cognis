import { escapeHtml } from "/static/reuse/escape-html.js";

export function renderDefinitionActions(id, i18n, editHtml = "") {
    return `<span class="library-definition-actions">${editHtml}<button class="btn-cancel" type="button" data-library-drop-definition="${escapeHtml(id)}" aria-label="${escapeHtml(i18n.t("ui.reuse.remove"))}"><picture><source media="(prefers-color-scheme: dark)" srcset="/assets/reuse/trash-dark.svg"><img src="/assets/reuse/trash-light.svg" alt=""></picture></button></span>`;
}

export function bindDefinitionRemoval(form, layer, schema) {
    form.addEventListener("click", (event) => {
        const button = event.target.closest("[data-library-drop-definition]");
        if (!button) return;
        const id = button.dataset.libraryDropDefinition;
        for (const relationship of layer.relationships ?? []) {
            if (
                schema.layers.find(
                    (candidate) => candidate.id === relationship.targetLayer,
                )?.semanticRole !== "definition"
            )
                continue;
            const select = form.elements[`relationship:${relationship.id}`];
            for (const option of select?.options ?? [])
                if (option.value === id) option.selected = false;
        }
        button.closest(".library-editor-aggregate")?.remove();
        form.dispatchEvent(new Event("change", { bubbles: true }));
    });
}
