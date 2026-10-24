import { languageFlashcardsUrl } from "/static/gateways/study/reuse/explore.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { saveStudyDeck } from "../decks-client.js";
import { parseAnkiNotes } from "../anki.js";

export async function editDeck(
    deck,
    schemas,
    entries,
    i18n,
    importing = false,
    language,
) {
    let form;
    let saved = false;
    let notes = deck?.notes ?? [];
    const layers = schemas.flatMap((schema) =>
        schema.layers.map((layer) => ({
            id: `${schema.id}:${layer.id}`,
            label:
                layer.metadata?.labels?.[document.documentElement.lang] ??
                layer.id,
        })),
    );
    const ids = new Set(deck?.entryIds ?? []);
    const label = (entry) =>
        `${entry.label} · ${layers.find((layer) => layer.id === `${entry.schemaId}:${entry.layer}`)?.label ?? entry.layer}`;
    const renderChoices = () => {
        const layer = form.elements.layer.value;
        const query = form.elements.query.value.trim().toLocaleLowerCase();
        form.querySelector("[data-deck-picker]").innerHTML = entries
            .filter(
                (entry) =>
                    (layer
                        ? `${entry.schemaId}:${entry.layer}` === layer
                        : !entry.hidden) &&
                    label(entry).toLocaleLowerCase().includes(query),
            )
            .map(
                (entry) =>
                    `<label><input type="checkbox" data-deck-entry="${escapeHtml(entry.id)}"${ids.has(entry.id) ? " checked" : ""}><span>${escapeHtml(label(entry))}</span></label>`,
            )
            .join("");
    };
    await openPopup({
        title: i18n.t(
            importing
                ? "adapter.study.flashcards.deck_import"
                : deck
                  ? "adapter.study.flashcards.deck_edit"
                  : "adapter.study.flashcards.deck_create",
        ),
        maxWidth: "64rem",
        closeProtection: true,
        body: createFormBuilder(
            { i18n, escapeHtml },
            {
                formId: "study-deck-editor",
                formClassName: "study-deck-editor",
                includeSubmitButton: false,
                fields: [
                    {
                        name: "name",
                        required: true,
                        labelKey: "ui.reuse.name",
                        value: deck?.name ?? "",
                        criteria: [
                            {
                                id: "nameMax",
                                type: "maxLength",
                                value: 100,
                                messageKey:
                                    "adapter.study.flashcards.deck_save_error",
                            },
                        ],
                    },
                    ...(importing
                        ? [
                              {
                                  name: "file",
                                  type: "file",
                                  required: true,
                                  labelKey: "ui.reuse.file",
                                  attributes: {
                                      accept: ".tsv,.txt,text/tab-separated-values,text/plain",
                                  },
                              },
                          ]
                        : []),
                    {
                        name: "layer",
                        type: "select",
                        labelKey: "adapter.study.flashcards.deck_layer",
                        options: [
                            { value: "", label: i18n.t("ui.reuse.all") },
                            ...layers.map((layer) => ({
                                value: layer.id,
                                label: layer.label,
                            })),
                        ],
                    },
                    {
                        name: "query",
                        type: "search",
                        labelKey: "ui.reuse.search",
                    },
                ],
            },
        ).render(),
        actions: [
            { id: "save", label: i18n.t("ui.reuse.save"), variant: "confirm" },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
        ],
        onOpen: (overlay) => {
            form = overlay.querySelector("#study-deck-editor");
            const picker = document.createElement("div");
            picker.className = "study-deck-picker";
            picker.dataset.deckPicker = "";
            form.appendChild(picker);
            renderChoices();
            form.elements.layer.addEventListener("change", renderChoices);
            form.elements.query.addEventListener("input", renderChoices);
            form.querySelector("[data-deck-picker]").addEventListener(
                "change",
                (event) => {
                    const id = event.target.dataset.deckEntry;
                    if (id) event.target.checked ? ids.add(id) : ids.delete(id);
                },
            );
        },
        onAction: async (action) => {
            if (action !== "save") return true;
            if (!form.reportValidity()) return false;
            try {
                if (importing)
                    notes = parseAnkiNotes(
                        await form.elements.file.files[0].text(),
                    );
                await saveStudyDeck(
                    {
                        name: form.elements.name.value,
                        entryIds: [...ids],
                        notes,
                        language,
                    },
                    deck?.id,
                );
                showToast(i18n.t("adapter.study.flashcards.deck_saved"), {
                    variant: "success",
                });
                saved = true;
                return true;
            } catch {
                showToast(i18n.t("adapter.study.flashcards.deck_save_error"), {
                    variant: "error",
                });
                return false;
            }
        },
    });
    if (saved) await navigateTo(languageFlashcardsUrl(language));
}
