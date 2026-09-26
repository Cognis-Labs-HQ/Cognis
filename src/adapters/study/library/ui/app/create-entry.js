import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { renderInfoTooltip } from "/static/reuse/info-tooltip.js";
import { showToast } from "/static/reuse/toast.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";
import {
    createLibraryEntry,
    fetchLibraryForms,
    fetchLibraryLookupProviders,
    fetchLibraryLookupSuggestions,
    fetchLibraryLocations,
    requestLibraryPromotion,
} from "/static/gateways/study/ui/library-client.js";
import {
    bindLibraryEditorControls,
    editorBody,
    readFields,
    readReferences,
} from "./admin-interactions.js";
import {
    definitionText,
    layerForEntry,
    localizedLabel,
    pronunciationValues,
} from "./presentation.js";
import {
    mountEditableRelationshipCarousels,
    pronunciationRelationshipsFor,
} from "./pronunciation-editor.js";

export async function chooseCreateLayer({
    schema,
    contributions,
    preferredLayerId,
    i18n,
}) {
    const permitted = schema.layers.filter(
        (layer) =>
            ![
                "atomicWritingUnit",
                "definition",
                "meaning",
                "particle",
            ].includes(layer.semanticRole),
    );
    if (!permitted.length) return null;
    let select;
    const action = await openPopup({
        title: i18n.t("gateway.study.library_create"),
        body: `<label><span>${escapeHtml(i18n.t("gateway.study.library_composer_layer"))}</span><select data-library-create-layer>${permitted.map((layer) => `<option value="${escapeHtml(layer.id)}"${layer.id === preferredLayerId ? " selected" : ""}>${escapeHtml(localizedLabel(layer.metadata, schema.language) || layer.id)}</option>`).join("")}</select></label>`,
        actions: [
            {
                id: "continue",
                label: i18n.t("ui.reuse.next"),
                variant: "confirm",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
        ],
        onOpen(overlay) {
            select = overlay.querySelector("[data-library-create-layer]");
        },
    });
    return action === "continue" ? select.value : null;
}

export async function openCreateEntryPopup({
    schemas,
    entries,
    schemaId,
    layerId,
    i18n,
    contributions: suppliedContributions,
    initialLabel = "",
}) {
    const schema = schemas.find(({ id }) => id === schemaId);
    const layer = schema?.layers.find(({ id }) => id === layerId);
    if (!schema || !layer) return null;
    const [access, loadedContributions, lookupProviders] = await Promise.all([
        fetchLibraryLocations(schema.language),
        suppliedContributions
            ? Promise.resolve(suppliedContributions)
            : fetchLibraryForms(),
        fetchLibraryLookupProviders({
            schemaId,
            schemaVersion: schema.version,
            layer: layerId,
        }),
    ]);
    const contributions = loadedContributions ?? [];
    const contributedConstructor = contributions.find(
        (item) =>
            item.schemaId === schemaId &&
            item.layerId === layerId &&
            item.cardConstructor,
    )?.cardConstructor;
    const constructor =
        contributedConstructor ??
        layer?.cardConstructor ??
        (layer
            ? {
                  fields: (layer.fields ?? []).map(({ id }) => id),
                  relationships: (layer.relationships ?? []).map(
                      ({ id }) => id,
                  ),
                  defaults: {},
              }
            : null);
    if (!constructor || !access.writable.length) return null;
    const contributedFields = contributions
        .filter(
            (item) => item.schemaId === schemaId && item.layerId === layerId,
        )
        .flatMap(({ fields }) => fields ?? []);
    const contributedById = new Map(
        contributedFields.map((field) => [field.id, field]),
    );
    const fieldsById = new Map(
        (layer.fields ?? []).map((field) => [field.id, field]),
    );
    const relationshipsById = new Map(
        (layer.relationships ?? []).map((relationship) => [
            relationship.id,
            relationship,
        ]),
    );
    const constructorRelationshipIds = new Set(constructor.relationships ?? []);
    if (
        ["lexicalUnit", "orderedLexicalSequence"].includes(layer.semanticRole)
    ) {
        for (const relationship of layer.relationships ?? []) {
            const targetRole = schema.layers.find(
                ({ id }) => id === relationship.targetLayer,
            )?.semanticRole;
            if (!["definition", "meaning"].includes(targetRole))
                constructorRelationshipIds.add(relationship.id);
        }
    } else if (layer.semanticRole === "compoundWritingUnit") {
        for (const relationship of layer.relationships ?? []) {
            const targetRole = schema.layers.find(
                ({ id }) => id === relationship.targetLayer,
            )?.semanticRole;
            if (targetRole === "atomicWritingUnit")
                constructorRelationshipIds.add(relationship.id);
        }
    }
    const constructorRelationships = Array.from(constructorRelationshipIds)
        .map((relationshipId) => relationshipsById.get(relationshipId))
        .filter(Boolean);
    const constructorFieldIds = new Set(constructor.fields ?? []);
    if (["compoundWritingUnit", "lexicalUnit"].includes(layer.semanticRole))
        constructorFieldIds.add("pronunciation");
    if (layer.semanticRole === "orderedLexicalSequence")
        constructorFieldIds.delete("pronunciation");
    const editingLayer = {
        ...layer,
        fields: Array.from(constructorFieldIds)
            .map((fieldId) => {
                const field = fieldsById.get(fieldId);
                return contributedById.get(fieldId) ?? field;
            })
            .filter(Boolean),
        relationships: constructorRelationships,
    };
    const configuredPronunciationRelationshipIds = new Set(
        editingLayer.fields?.find(({ id }) => id === "pronunciation")?.input
            ?.linkRelationships ?? [],
    );
    const pronunciationRelationshipIds = new Set(
        pronunciationRelationshipsFor(
            editingLayer,
            schema,
            configuredPronunciationRelationshipIds,
        ).map(({ id }) => id),
    );
    const draft = {
        schemaId,
        schemaVersion: schema.version,
        layer: layerId,
        label: initialLabel,
        fields: structuredClone(constructor.defaults ?? {}),
        references: [],
    };
    const canPublishEveryone = access.writable.some(
        ({ scope }) => scope === "global",
    );
    const writableClasses = access.writable.filter(
        ({ scope }) => scope === "class",
    );
    const supportsTextComposition = [
        "lexicalUnit",
        "orderedLexicalSequence",
    ].includes(layer.semanticRole);
    const supportsRawInput = layer.semanticRole === "compoundWritingUnit";
    const lookupActions = `<div class="library-composer-lookups" hidden>${lookupProviders.map((provider) => `<button class="btn-neutral" type="button" data-library-lookup-provider="${escapeHtml(provider.id)}">${escapeHtml(i18n.t("gateway.study.library_lookup_with").replace("{{ service }}", localizedLabel(provider.metadata, document.documentElement.lang) || provider.id))}</button>`).join("")}</div>`;
    const compositionInput = supportsTextComposition
        ? `<section class="library-composer-text"><label><span>${escapeHtml(i18n.t("gateway.study.library_composer_text"))}</span><span class="library-composition-input"><span class="library-composition-blocks" data-library-composition-blocks aria-live="polite"></span><input data-library-composer-text autocomplete="off" value="${escapeHtml(initialLabel)}" required></span></label><div class="library-composer-assistance"><div data-library-composer-suggestions aria-live="polite"></div>${lookupActions}</div></section>`
        : supportsRawInput
          ? `<section class="library-composer-text"><label><span>${escapeHtml(i18n.t("gateway.study.library_composer_text"))}</span><input data-library-composer-text data-library-free-text autocomplete="off" value="${escapeHtml(initialLabel)}" required></label><div class="library-composer-assistance">${lookupActions}</div></section>`
          : "";
    const publishControls = `<input name="scope" type="hidden" value="user">${
        access.readable.some(({ scope }) => scope === "global")
            ? `<label class="library-admin-checkbox library-publish-choice"><input name="publishEveryone" type="checkbox" class="choice-checkbox"><span>${escapeHtml(i18n.t("gateway.study.library_publish_everyone"))}</span>${renderInfoTooltip(i18n.t("gateway.study.library_publish_everyone_info"), i18n.t("ui.reuse.more_information"))}</label>`
            : ""
    }${
        writableClasses.length && !canPublishEveryone
            ? `<label class="library-admin-checkbox"><input name="publishClass" type="checkbox" class="choice-checkbox" data-library-publish-class-toggle> <span>${escapeHtml(i18n.t("gateway.study.library_publish_class_option"))}</span></label><label data-library-class-choice hidden><span>${escapeHtml(i18n.t("gateway.study.library_class"))}</span><select name="classId">${writableClasses.map(({ scopeId }) => `<option value="${escapeHtml(scopeId)}">${escapeHtml(scopeId)}</option>`).join("")}</select></label>`
            : '<input type="hidden" name="classId" value="">'
    }${compositionInput}`;
    const { html, builder } = editorBody(
        draft,
        [
            {
                ...schema,
                layers: schema.layers.map((item) =>
                    item.id === layerId ? editingLayer : item,
                ),
            },
        ],
        entries,
        i18n,
        publishControls,
        {
            labelText:
                layer.semanticRole === "compoundWritingUnit"
                    ? i18n.t("gateway.study.library_composer_text")
                    : localizedLabel(constructor.label, schema.language) ||
                      i18n.t("gateway.study.library_admin_label"),
            includeAlwaysShowDefinition:
                constructor.allowAlwaysShowDefinition === true,
            includeHidden: false,
            relationshipCarousels: true,
            inlinePronunciationCarousel: true,
            generatedLabel: supportsTextComposition || supportsRawInput,
            persistentExtra: true,
            allowDefinitionCreate: layer.semanticRole !== "definition",
        },
    );
    let form;
    let carouselController;
    const cardType =
        localizedLabel(layer.metadata, schema.language) || layer.id;
    const action = await openPopup({
        title: i18n
            .t("gateway.study.library_create_typed")
            .replace("{type}", cardType),
        body: html,
        maxWidth: "min(72rem, 96vw)",
        closeProtection: true,
        actions: [
            {
                id: "create",
                label: i18n.t("gateway.study.library_create"),
                variant: "confirm",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
        ],
        onAction(actionId, overlay) {
            if (actionId !== "create") return true;
            const activeForm = overlay.querySelector(
                "[data-library-admin-editor]",
            );
            activeForm?.compositionController?.validate();
            if (
                activeForm?.querySelector('[data-uploading="true"]') ||
                !activeForm?.reportValidity()
            )
                return false;
            return true;
        },
        onOpen(overlay) {
            form = overlay.querySelector("[data-library-admin-editor]");
            builder.attach(form);
            bindLibraryEditorControls(form, draft, i18n);
            form.compositionOrder = [];
            carouselController = mountEditableRelationshipCarousels(
                form,
                overlay,
                entries,
                schema,
                editingLayer,
                {
                    onChange: ({ id, values }) => {
                        const select = form.elements[`relationship:${id}`];
                        if (!select) return;
                        if (pronunciationRelationshipIds.has(id)) return;
                        const selected = new Set(values);
                        const previous = new Set(
                            Array.from(
                                select.selectedOptions,
                                (option) => option.value,
                            ),
                        );
                        form.compositionOrder = form.compositionOrder.filter(
                            (value) =>
                                selected.has(value) || !previous.has(value),
                        );
                        values.forEach((value) => {
                            if (!previous.has(value))
                                form.compositionOrder.push(value);
                        });
                        Array.from(select.options).forEach((option) => {
                            option.selected = selected.has(option.value);
                        });
                        values.forEach((value) => {
                            const option = Array.from(select.options).find(
                                (candidate) => candidate.value === value,
                            );
                            if (option) select.append(option);
                        });
                        form.dispatchEvent(
                            new Event("library-composition-change"),
                        );
                    },
                    onAdd: async ({ id, carousel }) => {
                        const relationship = editingLayer.relationships.find(
                            (candidate) => candidate.id === id,
                        );
                        if (!relationship) return;
                        const suggestedLabel =
                            carousel.dataset.suggestedLabel ?? "";
                        const created = await openCreateEntryPopup({
                            schemas,
                            entries,
                            schemaId,
                            layerId: relationship.targetLayer,
                            i18n,
                            contributions,
                            initialLabel: suggestedLabel,
                        });
                        delete carousel.dataset.suggestedLabel;
                        if (!created) return;
                        const compositionInput = form.querySelector(
                            "[data-library-composer-text]",
                        );
                        if (compositionInput && suggestedLabel) {
                            compositionInput.value = compositionInput.value
                                .replace(suggestedLabel, "")
                                .trim();
                            compositionInput.dispatchEvent(
                                new Event("input", { bubbles: true }),
                            );
                        }
                        entries.push(created);
                        const select = form.elements[`relationship:${id}`];
                        const option = new Option(
                            created.label,
                            created.id,
                            true,
                            true,
                        );
                        select.append(option);
                        const item = document.createElement("button");
                        item.type = "button";
                        item.className =
                            "btn-neutral horizontal-carousel-item is-selected";
                        item.dataset.carouselValue = created.id;
                        item.setAttribute("aria-pressed", "true");
                        item.innerHTML = `<span>${escapeHtml(created.label)}</span><small data-carousel-order></small>`;
                        carousel
                            .querySelector(".horizontal-carousel-track")
                            ?.append(item);
                        item.click();
                        item.click();
                    },
                },
            );
            form.compositionController = bindTextComposition(
                form,
                entries,
                editingLayer,
                schema,
                i18n,
            );
            if (supportsRawInput) bindRawInput(form, i18n);
            bindLookupProviders(form, draft, i18n);
            form.querySelector(
                "[data-library-add-definition]",
            )?.addEventListener("click", async () => {
                const relationship = editingLayer.relationships.find(
                    ({ targetLayer }) =>
                        schema.layers.find(({ id }) => id === targetLayer)
                            ?.semanticRole === "definition",
                );
                if (!relationship) return;
                const created = await openDefinitionPopup({
                    schema,
                    schemaId,
                    layerId: relationship.targetLayer,
                    i18n,
                });
                if (!created) return;
                entries.push(created);
                const select = form.elements[`relationship:${relationship.id}`];
                select?.append(
                    new Option(created.label, created.id, true, true),
                );
                const panel = form.querySelector(
                    '[data-library-editor-panel="definitions"]',
                );
                panel
                    ?.querySelector("[data-library-definition-empty]")
                    ?.remove();
                panel?.insertAdjacentHTML(
                    "afterbegin",
                    `<article class="library-editor-aggregate"><header><strong>${escapeHtml(created.label)}</strong></header></article>`,
                );
            });
            const publishClass = form.elements.publishClass;
            const classChoice = form.querySelector(
                "[data-library-class-choice]",
            );
            publishClass?.addEventListener("change", () => {
                if (classChoice) classChoice.hidden = !publishClass.checked;
            });
        },
    });
    carouselController?.abort();
    form?.compositionController?.validate();
    if (
        action !== "create" ||
        form?.querySelector('[data-uploading="true"]') ||
        !form?.reportValidity()
    )
        return null;
    const publishEveryone = form.elements.publishEveryone?.checked === true;
    const scope =
        publishEveryone && canPublishEveryone
            ? "global"
            : form.elements.publishClass?.checked
              ? "class"
              : "user";
    const scopeId =
        scope === "class"
            ? form.elements.classId.value
            : scope === "global"
              ? "global"
              : undefined;
    const references = readReferences(form, editingLayer);
    const fields = readFields(form, editingLayer, draft);
    if (layer.semanticRole === "orderedLexicalSequence") {
        fields.pronunciation = (form.compositionOrder ?? [])
            .map((entryId) => entries.find(({ id }) => id === entryId))
            .map((candidate) =>
                derivedPronunciation(candidate, entries, schema),
            )
            .join("");
    }
    const entry = {
        ...draft,
        label: form.elements.label.value,
        class: form.elements.class.value || undefined,
        tags: form.elements.tags.value.split("\u001f").filter(Boolean),
        fields,
        references,
        definitionLanguages:
            layer.semanticRole === "definition"
                ? ["de", "en", "id", "ja"]
                : undefined,
        alwaysShowDefinition:
            form.elements.alwaysShowDefinition?.checked === true,
        hidden:
            form.elements.hidden?.value === "true" ||
            form.elements.hidden?.checked === true,
    };
    const createAndRequestPublication = async (candidate) => {
        const created = await createLibraryEntry({ scope, scopeId }, candidate);
        if (publishEveryone && !canPublishEveryone)
            await requestLibraryPromotion(created.id, {
                scope: "global",
                scopeId: "global",
            });
        return created;
    };
    try {
        return await createAndRequestPublication(entry);
    } catch (error) {
        if (error.message !== "content_conflict") throw error;
        const decision = await openPopup({
            title: i18n.t("gateway.study.library_conflict_title"),
            body: `<p>${escapeHtml(i18n.t("gateway.study.library_conflict_body"))}</p>`,
            actions: [
                {
                    id: "continue",
                    label: i18n.t("gateway.study.library_create_anyway"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
            ],
        });
        return decision === "continue"
            ? createAndRequestPublication({ ...entry, allowConflict: true })
            : null;
    }
}

async function openDefinitionPopup({ schema, schemaId, layerId, i18n }) {
    const layer = schema.layers.find(({ id }) => id === layerId);
    const localization = layer?.definitionLocalization;
    if (!layer || !localization) return null;
    const languages = ["de", "en", "id", "ja"];
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
        body: builder.render(),
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
    return createLibraryEntry(
        { scope: "user" },
        {
            schemaId,
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
}

function entryDefinition(entry, entries, schema) {
    const definition = (entry.references ?? [])
        .map(({ entryId }) => entries.find(({ id }) => id === entryId))
        .find((candidate) => {
            const candidateLayer = candidate
                ? layerForEntry([schema], candidate)
                : null;
            return ["definition", "meaning"].includes(
                candidateLayer?.semanticRole,
            );
        });
    return definition
        ? definitionText(
              definition,
              layerForEntry([schema], definition),
              document.documentElement.lang,
          )
        : "";
}

function derivedPronunciation(entry, entries, schema, visited = new Set()) {
    if (!entry || visited.has(entry.id)) return "";
    visited.add(entry.id);
    const direct = pronunciationValues(entry).find(Boolean);
    const entryLayer = layerForEntry([schema], entry);
    if (entryLayer?.semanticRole === "atomicWritingUnit")
        return direct || entry.label;
    const parts = (entry.references ?? [])
        .map(({ entryId }) => entries.find(({ id }) => id === entryId))
        .map((candidate) =>
            derivedPronunciation(candidate, entries, schema, visited),
        )
        .filter(Boolean);
    return parts.join("") || direct || "";
}

function applyLookupFields(form, fields, draft) {
    Object.entries(fields ?? {}).forEach(([fieldId, value]) => {
        draft.fields[fieldId] = value;
        const control = form.elements[`field:${fieldId}`];
        if (!control) return;
        if (control.hasAttribute("data-library-provider-field")) {
            control.libraryFieldValue = value;
            return;
        }
        if (control instanceof RadioNodeList) {
            Array.from(control).forEach((option) => {
                option.checked = Array.isArray(value)
                    ? value.includes(option.value)
                    : option.value === value;
            });
            return;
        }
        if (control.type === "checkbox") {
            control.checked = value === true;
            return;
        }
        if (control.multiple) {
            Array.from(control.options).forEach((option) => {
                option.selected = Array.isArray(value)
                    ? value.includes(option.value)
                    : option.value === value;
            });
            return;
        }
        control.value = Array.isArray(value)
            ? value.join("\u001f")
            : value && typeof value === "object"
              ? JSON.stringify(value)
              : value;
        const tagList = control
            .closest("[data-library-tag-field]")
            ?.querySelector(".library-tag-list");
        if (tagList && Array.isArray(value)) {
            tagList.replaceChildren(
                ...value.map((item) => {
                    const tag = document.createElement("button");
                    tag.type = "button";
                    tag.className = "btn-neutral";
                    tag.dataset.libraryTag = item;
                    tag.textContent = `${item} ×`;
                    return tag;
                }),
            );
        }
    });
}

function bindRawInput(form, i18n) {
    const input = form.querySelector("[data-library-free-text]");
    const lookups = form.querySelector(".library-composer-lookups");
    const sync = () => {
        const value = input.value.trim();
        form.elements.label.value = value;
        input.dataset.lookupApproved = "";
        input.setCustomValidity(
            value ? i18n.t("gateway.study.library_lookup_empty") : "",
        );
        if (lookups) lookups.hidden = !value;
    };
    input.addEventListener("input", sync);
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") event.preventDefault();
    });
    sync();
}

function bindLookupProviders(form, draft, i18n) {
    form.querySelector(".library-composer-lookups")?.addEventListener(
        "click",
        async (event) => {
            const button = event.target.closest(
                "[data-library-lookup-provider]",
            );
            if (!button) return;
            const input = form.querySelector("[data-library-composer-text]");
            const label = input?.value.trim();
            if (!label) return;
            button.disabled = true;
            try {
                const [suggestion] = await fetchLibraryLookupSuggestions(
                    button.dataset.libraryLookupProvider,
                    { ...draft, label },
                );
                if (!suggestion) {
                    showToast(i18n.t("gateway.study.library_lookup_empty"), {
                        variant: "info",
                    });
                    return;
                }
                applyLookupFields(form, suggestion.fields, draft);
                for (const reference of suggestion.references ?? []) {
                    const item = form.querySelector(
                        `[data-horizontal-carousel="${CSS.escape(reference.relation)}"] [data-carousel-value="${CSS.escape(reference.entryId)}"]`,
                    );
                    if (item && !item.classList.contains("is-selected"))
                        item.click();
                }
                if (!input.hasAttribute("data-library-free-text")) {
                    input.value = "";
                    input.dispatchEvent(new Event("input", { bubbles: true }));
                }
                if (
                    input.hasAttribute("data-library-free-text") ||
                    suggestion.label ||
                    !(suggestion.references ?? []).length
                )
                    form.elements.label.value = suggestion.label ?? label;
                if (input.hasAttribute("data-library-free-text")) {
                    input.dataset.lookupApproved = "true";
                    input.setCustomValidity("");
                }
                showToast(i18n.t("gateway.study.library_lookup_applied"), {
                    variant: "success",
                });
            } catch {
                showToast(i18n.t("gateway.study.library_lookup_error"), {
                    variant: "error",
                });
            } finally {
                button.disabled = false;
            }
        },
    );
}

function bindTextComposition(form, entries, layer, schema, i18n) {
    const input = form.querySelector("[data-library-composer-text]");
    const output = form.querySelector("[data-library-composer-suggestions]");
    const blocks = form.querySelector("[data-library-composition-blocks]");
    const lookups = form.querySelector(".library-composer-lookups");
    if (!input || !output || !blocks) return { validate: () => true };
    const relationships = layer.relationships ?? [];
    const candidates = relationships
        .flatMap((relationship) =>
            entries
                .filter((entry) => entry.layer === relationship.targetLayer)
                .map((entry) => ({
                    ...entry,
                    relationshipId: relationship.id,
                    preview: entryDefinition(entry, entries, schema),
                })),
        )
        .sort(
            (left, right) =>
                Number(Boolean(right.preview)) - Number(Boolean(left.preview)),
        )
        .filter(
            (candidate, index, all) =>
                all.findIndex(
                    ({ label }) =>
                        label.trim().normalize("NFKC") ===
                        candidate.label.trim().normalize("NFKC"),
                ) === index,
        );
    const selectedLabels = () => {
        const labels = new Map(
            relationships.flatMap((relationship) =>
                Array.from(
                    form.elements[`relationship:${relationship.id}`]?.options ??
                        [],
                    (option) => [option.value, option.textContent.trim()],
                ),
            ),
        );
        return (form.compositionOrder ?? []).map(
            (value) => labels.get(value) ?? "",
        );
    };
    const syncPronunciation = () => {
        const control = form.elements["field:pronunciation"];
        if (!control) return;
        const selectedPronunciation = (form.compositionOrder ?? [])
            .map((id) => entries.find((entry) => entry.id === id))
            .map((entry) => derivedPronunciation(entry, entries, schema))
            .join("");
        const normalizedInput = input.value.trim().normalize("NFKC");
        const exactInput = candidates.find(
            ({ label }) => label.trim().normalize("NFKC") === normalizedInput,
        );
        const inputPronunciation = exactInput
            ? derivedPronunciation(exactInput, entries, schema)
            : "";
        const pronunciation = `${selectedPronunciation}${inputPronunciation}`;
        if (pronunciation) control.value = pronunciation;
    };
    const renderBlocks = () => {
        blocks.innerHTML = (form.compositionOrder ?? [])
            .map((id) => entries.find((entry) => entry.id === id))
            .filter(Boolean)
            .map(
                (entry) =>
                    `<button class="btn-neutral library-composition-block" type="button" draggable="true" data-library-composition-id="${escapeHtml(entry.id)}"><span>${escapeHtml(entry.label)}</span><span aria-hidden="true">×</span></button>`,
            )
            .join("");
    };
    const syncLabel = () => {
        for (const relationship of relationships) {
            const select = form.elements[`relationship:${relationship.id}`];
            for (const id of form.compositionOrder ?? []) {
                const option = select
                    ? Array.from(select.options).find(
                          ({ value }) => value === id,
                      )
                    : null;
                if (option?.selected) select.append(option);
            }
        }
        const resolved = selectedLabels().join("");
        form.elements.label.value = `${resolved}${input.value.trim()}`;
        input.required = !resolved;
        const relationshipParents = form.querySelector(
            "[data-library-relationship-parents]",
        );
        if (relationshipParents) {
            const labels = relationships.flatMap((relationship) =>
                Array.from(
                    form.elements[`relationship:${relationship.id}`]
                        ?.selectedOptions ?? [],
                    (option) => option.textContent.trim(),
                ),
            );
            relationshipParents.innerHTML = labels.length
                ? labels
                      .map((label) => `<span>${escapeHtml(label)}</span>`)
                      .join("")
                : `<p>${escapeHtml(i18n.t("gateway.study.library_editor_no_relationships"))}</p>`;
        }
        syncPronunciation();
        renderBlocks();
    };
    const renderSuggestions = () => {
        const text = input.value.trim();
        if (lookups) lookups.hidden = !text;
        const normalizedText = text.normalize("NFKC");
        const matches = candidates.filter(
            ({ label }) => label.trim().normalize("NFKC") === normalizedText,
        );
        const fallbackRelationship = relationships[0]?.id;
        output.innerHTML = `${matches
            .map(
                (match) =>
                    `<button class="btn-neutral library-composer-suggestion" type="button" data-library-suggestion="${escapeHtml(match.id)}" data-relationship="${escapeHtml(match.relationshipId)}" data-suggestion-label="${escapeHtml(match.label)}">${escapeHtml(match.label)}${match.preview ? `<span class="horizontal-carousel-preview" role="tooltip"><strong>${escapeHtml(match.label)}</strong><span>${escapeHtml(match.preview)}</span></span>` : ""}</button>`,
            )
            .join(
                "",
            )}${text && fallbackRelationship && !matches.length ? `<button class="btn-confirm library-composer-unmatched" type="button" data-library-create-unmatched="${escapeHtml(fallbackRelationship)}" data-unmatched-label="${escapeHtml(text)}">${escapeHtml(text)} — ${escapeHtml(i18n.t("gateway.study.library_composer_no_match"))}</button>` : ""}`;
        syncLabel();
    };
    input.addEventListener("input", renderSuggestions);
    form.addEventListener("change", syncLabel);
    form.addEventListener("library-composition-change", syncLabel);
    output.addEventListener("click", (event) => {
        const suggestion = event.target.closest("[data-library-suggestion]");
        if (suggestion) {
            form.querySelector(
                `[data-horizontal-carousel="${CSS.escape(suggestion.dataset.relationship)}"] [data-carousel-value="${CSS.escape(suggestion.dataset.librarySuggestion)}"]`,
            )?.click();
            input.value = input.value
                .replace(suggestion.dataset.suggestionLabel, "")
                .trim();
            renderSuggestions();
            return;
        }
        const unmatched = event.target.closest(
            "[data-library-create-unmatched]",
        );
        if (!unmatched) return;
        const carousel = form.querySelector(
            `[data-horizontal-carousel="${CSS.escape(unmatched.dataset.libraryCreateUnmatched)}"]`,
        );
        if (!carousel) return;
        carousel.dataset.suggestedLabel = unmatched.dataset.unmatchedLabel;
        carousel.querySelector("[data-carousel-add]")?.click();
    });
    let draggedId = null;
    blocks.addEventListener("dragstart", (event) => {
        const block = event.target.closest("[data-library-composition-id]");
        draggedId = block?.dataset.libraryCompositionId ?? null;
        if (draggedId) event.dataTransfer?.setData("text/plain", draggedId);
    });
    blocks.addEventListener("dragover", (event) => event.preventDefault());
    blocks.addEventListener("drop", (event) => {
        event.preventDefault();
        const target = event.target.closest("[data-library-composition-id]");
        const targetId = target?.dataset.libraryCompositionId;
        if (!draggedId || !targetId || draggedId === targetId) return;
        const order = form.compositionOrder.filter((id) => id !== draggedId);
        order.splice(order.indexOf(targetId), 0, draggedId);
        form.compositionOrder = order;
        syncLabel();
    });
    blocks.addEventListener("click", (event) => {
        const block = event.target.closest("[data-library-composition-id]");
        const id = block?.dataset.libraryCompositionId;
        if (!id) return;
        form.querySelector(
            `[data-carousel-value="${CSS.escape(id)}"].is-selected`,
        )?.click();
    });
    renderSuggestions();
    return {
        validate() {
            syncLabel();
            const unresolved = relationships.length > 0 && input.value.trim();
            input.setCustomValidity(
                unresolved
                    ? i18n.t("gateway.study.library_composer_resolve_input")
                    : "",
            );
            return !unresolved;
        },
    };
}
