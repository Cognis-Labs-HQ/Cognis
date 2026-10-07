import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { localizeLibraryDefinition } from "/static/gateways/study/ui/library-client.js";
import { DEFINITION_LANGUAGES } from "./definition-editor.js";
import { LIBRARY_COMPOSER_LIMITS } from "../composer-limits.js";

export function lookupSourceUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "https:" ? url.href : "";
    } catch {
        return "";
    }
}

export async function chooseLookupSuggestion(suggestions, i18n) {
    const drafts = structuredClone(suggestions);
    let selected = drafts[0];
    let panel;
    let accepted;
    const readDefinitions = () =>
        Array.from(panel.querySelectorAll("[data-lookup-definition]")).map(
            (article) => ({
                ...selected.definitions[
                    Number(article.dataset.lookupDefinition)
                ],
                translations: Object.fromEntries(
                    DEFINITION_LANGUAGES.map((language) => [
                        language,
                        article
                            .querySelector(
                                `[data-lookup-language="${language}"]`,
                            )
                            .value.trim(),
                    ]).filter(([, text]) => text),
                ),
                included: article.querySelector("[data-lookup-include]")
                    .checked,
            }),
        );
    const render = () => {
        const source = lookupSourceUrl(selected.sourceUrl);
        const pronunciations = selected.fields?.pronunciation;
        panel.innerHTML = `<h3>${escapeHtml(selected.label ?? "")}</h3>${Array.isArray(pronunciations) ? `<p>${pronunciations.map(escapeHtml).join(" · ")}</p>` : ""}${selected.tags?.length ? `<p>${selected.tags.map(escapeHtml).join(" · ")}</p>` : ""}${(selected.definitions ?? []).map((definition, index) => `<article class="library-editor-aggregate" data-lookup-definition="${index}"><label><input class="choice-checkbox" type="checkbox" data-lookup-include${(definition.included ?? index < LIBRARY_COMPOSER_LIMITS.definitions) ? " checked" : ""}> ${escapeHtml(definition.translations.en ?? Object.values(definition.translations)[0] ?? "")}</label><div class="library-lookup-translations">${DEFINITION_LANGUAGES.map((language) => `<label><span>${language.toUpperCase()}</span><textarea data-lookup-language="${language}" maxlength="500">${escapeHtml(definition.translations[language] ?? "")}</textarea></label>`).join("")}</div></article>`).join("")}${source ? `<a href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">${escapeHtml(i18n.t("gateway.study.library_dictionary_source"))}</a>` : ""}`;
    };
    const action = await openPopup({
        title: i18n.t("gateway.study.library_lookup_result"),
        maxWidth: "min(60rem, 96vw)",
        body: `${drafts.length > 1 ? `<label>${escapeHtml(i18n.t("gateway.study.library_lookup_result"))}<select data-lookup-result>${drafts.map((suggestion, index) => `<option value="${index}">${escapeHtml(suggestion.label ?? suggestion.provenance)}</option>`).join("")}</select></label>` : ""}<div data-lookup-preview></div><button class="btn-neutral" type="button" data-lookup-translate>${escapeHtml(i18n.t("gateway.study.library_translate_definitions"))}</button>`,
        actions: [
            {
                id: "apply",
                label: i18n.t("gateway.study.library_lookup_apply"),
                variant: "confirm",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "neutral",
            },
        ],
        onOpen(overlay) {
            panel = overlay.querySelector("[data-lookup-preview]");
            render();
            overlay
                .querySelector("[data-lookup-result]")
                ?.addEventListener("change", (event) => {
                    selected.definitions = readDefinitions();
                    selected = drafts[Number(event.target.value)];
                    render();
                });
            const button = overlay.querySelector("[data-lookup-translate]");
            button.hidden = !drafts.some(
                (suggestion) => suggestion.definitions?.length,
            );
            button.addEventListener("click", async () => {
                const current = selected;
                const definitions = readDefinitions();
                button.disabled = true;
                try {
                    const results = await Promise.all(
                        definitions.map(({ translations }) =>
                            localizeLibraryDefinition(
                                translations,
                                DEFINITION_LANGUAGES,
                            ),
                        ),
                    );
                    if (current !== selected) return;
                    current.definitions = definitions.map(
                        (definition, index) => ({
                            ...definition,
                            translations: results[index].translations,
                        }),
                    );
                    render();
                    if (
                        results.some(
                            ({ missingLanguages }) => missingLanguages.length,
                        )
                    )
                        showToast(
                            i18n.t("gateway.study.library_translation_missing"),
                            { variant: "warning" },
                        );
                } catch {
                    showToast(i18n.t("gateway.study.library_lookup_error"), {
                        variant: "error",
                    });
                } finally {
                    button.disabled = false;
                }
            });
        },
        onAction(actionId) {
            if (actionId !== "apply") return true;
            const definitions = readDefinitions().filter(
                ({ included }) => included,
            );
            if (definitions.length > LIBRARY_COMPOSER_LIMITS.definitions) {
                showToast(
                    i18n
                        .t("gateway.study.library_definition_limit")
                        .replace(
                            "{{ count }}",
                            String(LIBRARY_COMPOSER_LIMITS.definitions),
                        ),
                    { variant: "error" },
                );
                return false;
            }
            if (definitions.some(({ translations }) => !translations.en)) {
                showToast(i18n.t("gateway.study.library_validation_error"), {
                    variant: "error",
                });
                return false;
            }
            accepted = {
                ...selected,
                definitions: definitions.map(
                    ({ included, ...definition }) => definition,
                ),
            };
            return true;
        },
    });
    return action === "apply" ? accepted : null;
}
