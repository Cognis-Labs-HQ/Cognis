import { createFormBuilder } from "/static/reuse/form-builder.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import {
    createLibraryEntry,
    fetchLibraryEntry,
    localizeLibraryDefinition,
} from "/static/gateways/study/ui/library-client.js";
export const DEFINITION_LANGUAGES = ["de", "en", "id", "ja"];
export async function openDefinitionPopup({
    schema,
    schemaId,
    layerId,
    entries,
    i18n,
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
    return createDefinition({ schema, layerId, entries, translations });
}
export async function createDefinition({
    schema,
    layerId,
    entries,
    translations,
}) {
    const languages = DEFINITION_LANGUAGES;
    const localization = schema.layers.find(
        ({ id }) => id === layerId,
    )?.definitionLocalization;
    if (!localization) throw new Error("definition_layer_not_found");
    const normalizedLabel = translations.en.trim().normalize("NFKC");
    const existing = entries.find(
        (entry) =>
            entry.schemaId === schema.id &&
            entry.layer === layerId &&
            entry.label.trim().normalize("NFKC") === normalizedLabel,
    );
    if (existing) return { entry: existing, created: false };
    try {
        const entry = await createLibraryEntry(
            { scope: "user" },
            {
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
            },
        );
        return { entry, created: true };
    } catch (error) {
        const conflictId = error.details?.conflictEntryId;
        if (error.message !== "content_conflict" || !conflictId) throw error;
        const detail = await fetchLibraryEntry(conflictId);
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
    if (option) option.selected = true;
    else select.append(new Option(definition.label, definition.id, true, true));
    const panel = form.querySelector(
        '[data-library-editor-panel="definitions"]',
    );
    panel?.querySelector("[data-library-definition-empty]")?.remove();
    if (
        !panel?.querySelector(
            `[data-library-definition-id="${CSS.escape(definition.id)}"]`,
        )
    )
        panel?.insertAdjacentHTML(
            "afterbegin",
            `<article class="library-editor-aggregate" data-library-definition-id="${escapeHtml(definition.id)}"><header><strong>${escapeHtml(definition.label)}</strong></header><p>${DEFINITION_LANGUAGES.map(
                (language) => {
                    const text =
                        definition.fields?.[
                            schema.layers.find(
                                ({ id }) => id === definition.layer,
                            )?.definitionLocalization?.translationsField
                        ]?.[language];
                    return text
                        ? `${language.toUpperCase()}: ${escapeHtml(text)}`
                        : "";
                },
            )
                .filter(Boolean)
                .join(" · ")}</p></article>`,
        );
    select.dispatchEvent(new Event("change", { bubbles: true }));
}
