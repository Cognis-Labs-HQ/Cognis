import {
    renderDefinitionActions,
    bindDefinitionRemoval,
} from "../reuse/definition-actions.js";
import { findMatchingEntry } from "./entry-match.js";
import { openLibraryEntryEditor } from "../admin-interactions/index.js";
import { entryEditMode } from "../editability.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import {
    createLibraryEntry,
    fetchLibraryEntry,
    localizeLibraryDefinition,
} from "/static/gateways/study/ui/library-client.js";
import { DEFINITION_LANGUAGES } from "../definition-languages.js";
export async function openDefinitionPopup({
    schema,
    schemaId,
    layerId,
    entries,
    i18n,
    location = { scope: "user" },
}) {
    const layer = schema.layers.find(({ id }) => id === layerId);
    const localization = layer?.definitionLocalization;
    if (!layer || !localization) return null;
    const languages = DEFINITION_LANGUAGES;
    const builder = createFormBuilder(
        { i18n, escapeHtml },
        {
            formId: "library-definition-form",
            formAttributes: { "data-library-definition-form": true },
            includeSubmitButton: false,
            fields: languages.map((language) => ({
                name: language,
                label: language.toUpperCase(),
                required: true,
                maxCharacters: 500,
            })),
        },
    );
    let form;
    const action = await openPopup({
        title: i18n.t("gateway.study.library_add_definition"),
        body: `${builder.render()}<button class="btn-neutral" type="button" data-library-translate-definition>${escapeHtml(i18n.t("gateway.study.library_translate_definitions"))}</button>`,
        closeProtection: true,
        actions: [
            {
                id: "save",
                label: i18n.t("ui.reuse.save"),
                variant: "confirm",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
        ],
        onOpen(overlay) {
            form = overlay.querySelector("[data-library-definition-form]");
            builder.attach(form);
            overlay
                .querySelector("[data-library-translate-definition]")
                .addEventListener("click", async (event) => {
                    const button = event.currentTarget;
                    button.disabled = true;
                    try {
                        const result = await localizeLibraryDefinition(
                            Object.fromEntries(
                                languages.map((language) => [
                                    language,
                                    form.elements[language].value,
                                ]),
                            ),
                            languages,
                        );
                        for (const [language, text] of Object.entries(
                            result.translations,
                        ))
                            form.elements[language].value = text;
                        form.dispatchEvent(
                            new Event("input", { bubbles: true }),
                        );
                        if (result.missingLanguages.length)
                            showToast(
                                i18n.t(
                                    "gateway.study.library_translation_missing",
                                ),
                                { variant: "warning" },
                            );
                    } catch {
                        showToast(
                            i18n.t("gateway.study.library_lookup_error"),
                            { variant: "error" },
                        );
                    } finally {
                        button.disabled = false;
                    }
                });
        },
        onAction(actionId) {
            if (actionId !== "save") return true;
            return form?.reportValidity() === true;
        },
    });
    if (action !== "save" || !form) return null;
    const translations = Object.fromEntries(
        languages.map((language) => [language, form.elements[language].value]),
    );
    return createDefinition({
        schema,
        layerId,
        entries,
        translations,
        location,
    });
}
export async function createDefinition({
    schema,
    layerId,
    entries,
    translations,
    location = { scope: "user" },
}) {
    const languages = DEFINITION_LANGUAGES;
    const localization = schema.layers.find(
        ({ id }) => id === layerId,
    )?.definitionLocalization;
    if (!localization) throw new Error("definition_layer_not_found");
    const existing = findMatchingEntry(
        entries,
        { schemaId: schema.id, layer: layerId, label: translations.en },
        location,
    );
    if (existing) return { entry: existing, created: false };
    try {
        const entry = await createLibraryEntry(location, {
            schemaId: schema.id,
            schemaVersion: schema.version,
            layer: layerId,
            label: translations.en,
            class: "definition",
            hidden: true,
            definitionLanguages: languages,
            fields: {
                [localization.translationsField]: translations,
            },
            references: [],
        });
        if (!entries.some(({ id }) => id === entry.id)) entries.push(entry);
        return { entry, created: true };
    } catch (error) {
        const conflictId = error.details?.conflictEntryId;
        if (error.message !== "content_conflict" || !conflictId) throw error;
        const detail = await fetchLibraryEntry(conflictId);
        if (!entries.some(({ id }) => id === detail.entry.id))
            entries.push(detail.entry);
        return { entry: detail.entry, created: false };
    }
}

export function linkDefinition(form, schema, layer, entries, definition) {
    const relationship = layer.relationships.find(
        ({ targetLayer }) =>
            schema.layers.find(({ id }) => id === targetLayer)?.semanticRole ===
            "definition",
    );
    if (!relationship) throw new Error("definition_relationship_not_found");
    if (!entries.some(({ id }) => id === definition.id))
        entries.push(definition);
    const select = form.elements[`relationship:${relationship.id}`];
    const option = Array.from(select.options).find(
        ({ value }) => value === definition.id,
    );
    if (option) {
        const wasSelected = option.selected;
        option.selected = true;
        if (!wasSelected) select.append(option);
        option.textContent = definition.label;
    } else
        select.append(new Option(definition.label, definition.id, true, true));
    const panel = form.querySelector(
        '[data-library-editor-panel="definitions"]',
    );
    panel?.querySelector("[data-library-definition-empty]")?.remove();
    const previousCard = panel?.querySelector(
        `[data-library-definition-id="${CSS.escape(definition.id)}"]`,
    );
    const nextCard = previousCard?.nextElementSibling;
    previousCard?.remove();
    panel?.insertAdjacentHTML(
        "beforeend",
        `<article class="library-editor-aggregate" data-library-definition-id="${escapeHtml(definition.id)}"><header><strong>${escapeHtml(definition.label)}</strong>${renderDefinitionActions(definition.id, form.libraryDefinitionI18n, definition.canEdit !== false ? `<button class="btn-neutral" type="button" data-library-edit-definition="${escapeHtml(definition.id)}">${escapeHtml(form.libraryDefinitionI18n?.t("ui.reuse.edit") ?? "")}</button>` : "")}</header><p>${DEFINITION_LANGUAGES.map(
            (language) => {
                const text =
                    definition.fields?.[
                        schema.layers.find(({ id }) => id === definition.layer)
                            ?.definitionLocalization?.translationsField
                    ]?.[language];
                return text
                    ? `${language.toUpperCase()}: ${escapeHtml(text)}`
                    : "";
            },
        )
            .filter(Boolean)
            .join(" · ")}</p></article>`,
    );
    if (nextCard?.isConnected)
        panel.insertBefore(panel.lastElementChild, nextCard);
    select.dispatchEvent(new Event("change", { bubbles: true }));
}

export function bindCommittedDefinitionEditing(
    form,
    { schema, layer, entries, i18n },
) {
    form.libraryDefinitionI18n = i18n;
    bindDefinitionRemoval(form, layer, schema);
    form.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-library-edit-definition]");
        if (!button) return;
        button.disabled = true;
        try {
            const { entry } = await fetchLibraryEntry(
                button.dataset.libraryEditDefinition,
            );
            const mode = entryEditMode(entry);
            if (!mode) throw new Error("forbidden");
            await openLibraryEntryEditor({
                entry,
                entries,
                schemas: [schema],
                i18n,
                requestUpdate: mode === "request",
                onSaved(updated) {
                    if (mode !== "direct") return;
                    const existing = entries.find(
                        ({ id }) => id === updated.id,
                    );
                    if (existing) Object.assign(existing, updated);
                    linkDefinition(form, schema, layer, entries, updated);
                    form.dispatchEvent(new Event("change", { bubbles: true }));
                },
            });
        } catch {
            showToast(i18n.t("gateway.study.library_create_error"), {
                variant: "error",
            });
        } finally {
            button.disabled = false;
        }
    });
}
