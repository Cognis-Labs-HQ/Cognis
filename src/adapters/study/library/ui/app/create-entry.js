import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { renderInfoTooltip } from "/static/reuse/info-tooltip.js";
import { mountHorizontalCarousels } from "/static/reuse/horizontal-carousel.js";
import {
    createLibraryEntry,
    fetchLibraryForms,
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

export async function chooseCreateLayer({
    schema,
    contributions,
    preferredLayerId,
    i18n,
}) {
    const permitted = schema.layers.filter(
        (layer) =>
            !["atomicWritingUnit", "definition", "meaning"].includes(
                layer.semanticRole,
            ),
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
    const [access, loadedContributions] = await Promise.all([
        fetchLibraryLocations(
            schemas.find(({ id }) => id === schemaId)?.language,
        ),
        suppliedContributions
            ? Promise.resolve(suppliedContributions)
            : fetchLibraryForms(),
    ]);
    const contributions = loadedContributions ?? [];
    const schema = schemas.find(({ id }) => id === schemaId);
    const layer = schema?.layers.find(({ id }) => id === layerId);
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
    if (
        !schema ||
        !layer ||
        layer.semanticRole === "atomicWritingUnit" ||
        !constructor ||
        !access.writable.length
    )
        return null;
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
    const editingLayer = {
        ...layer,
        fields: (constructor.fields ?? []).map((fieldId) => {
            const field = fieldsById.get(fieldId);
            return contributedById.get(fieldId) ?? field;
        }),
        relationships: (constructor.relationships ?? []).map((relationshipId) =>
            relationshipsById.get(relationshipId),
        ),
    };
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
    const publishControls = `<input name="scope" type="hidden" value="user">${
        access.readable.some(({ scope }) => scope === "global")
            ? `<label class="library-admin-checkbox library-publish-choice"><input name="publishEveryone" type="checkbox" class="choice-checkbox"><span>${escapeHtml(i18n.t("gateway.study.library_publish_everyone"))}</span>${renderInfoTooltip(i18n.t("gateway.study.library_publish_everyone_info"), i18n.t("ui.reuse.more_information"))}</label>`
            : ""
    }${
        writableClasses.length && !canPublishEveryone
            ? `<label class="library-admin-checkbox"><input name="publishClass" type="checkbox" class="choice-checkbox" data-library-publish-class-toggle> <span>${escapeHtml(i18n.t("gateway.study.library_publish_class_option"))}</span></label><label data-library-class-choice hidden><span>${escapeHtml(i18n.t("gateway.study.library_class"))}</span><select name="classId">${writableClasses.map(({ scopeId }) => `<option value="${escapeHtml(scopeId)}">${escapeHtml(scopeId)}</option>`).join("")}</select></label>`
            : '<input type="hidden" name="classId" value="">'
    }<section class="library-composer-text"><label><span>${escapeHtml(i18n.t("gateway.study.library_composer_text"))}</span><span class="library-composition-input"><span class="library-composition-blocks" data-library-composition-blocks aria-live="polite"></span><input data-library-composer-text autocomplete="off" value="${escapeHtml(initialLabel)}" required></span></label><div data-library-composer-suggestions aria-live="polite"></div></section>`;
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
                localizedLabel(constructor.label, schema.language) ||
                i18n.t("gateway.study.library_admin_label"),
            includeAlwaysShowDefinition:
                constructor.allowAlwaysShowDefinition === true,
            includeHidden: false,
            relationshipCarousels: true,
            generatedLabel: true,
            persistentExtra: true,
            allowDefinitionCreate: layer.semanticRole !== "definition",
        },
    );
    let form;
    const action = await openPopup({
        title: i18n.t("gateway.study.library_create"),
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
            const controller = new AbortController();
            overlay.addEventListener("close", () => controller.abort(), {
                once: true,
            });
            form.compositionOrder = [];
            mountHorizontalCarousels(form, {
                signal: controller.signal,
                onChange: ({ id, values }) => {
                    const select = form.elements[`relationship:${id}`];
                    if (!select) return;
                    const selected = new Set(values);
                    const previous = new Set(
                        Array.from(
                            select.selectedOptions,
                            (option) => option.value,
                        ),
                    );
                    form.compositionOrder = form.compositionOrder.filter(
                        (value) => selected.has(value) || !previous.has(value),
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
                    form.dispatchEvent(new Event("library-composition-change"));
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
            });
            form.compositionController = bindTextComposition(
                form,
                entries,
                editingLayer,
                schema,
                i18n,
            );
            form.querySelector(
                "[data-library-add-definition]",
            )?.addEventListener("click", async () => {
                const relationship = editingLayer.relationships.find(
                    ({ targetLayer }) =>
                        schema.layers.find(({ id }) => id === targetLayer)
                            ?.semanticRole === "definition",
                );
                if (!relationship) return;
                const created = await openCreateEntryPopup({
                    schemas,
                    entries,
                    schemaId,
                    layerId: relationship.targetLayer,
                    i18n,
                    contributions,
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
    const entry = {
        ...draft,
        label: form.elements.label.value,
        class: form.elements.class.value || undefined,
        fields: readFields(form, editingLayer, draft),
        references: readReferences(form, editingLayer),
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

function bindTextComposition(form, entries, layer, schema, i18n) {
    const input = form.querySelector("[data-library-composer-text]");
    const output = form.querySelector("[data-library-composer-suggestions]");
    const blocks = form.querySelector("[data-library-composition-blocks]");
    if (!input || !output || !blocks) return { validate: () => true };
    const relationships = layer.relationships ?? [];
    const candidates = relationships.flatMap((relationship) =>
        entries
            .filter((entry) => entry.layer === relationship.targetLayer)
            .map((entry) => ({
                ...entry,
                relationshipId: relationship.id,
                preview: entryDefinition(entry, entries, schema),
            })),
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
    const inferRelationships = () => {
        const selectedEntries = (form.compositionOrder ?? [])
            .map((id) => entries.find((entry) => entry.id === id))
            .filter(Boolean);
        for (const selectedEntry of selectedEntries) {
            for (const reference of selectedEntry.references ?? []) {
                const target = entries.find(
                    ({ id }) => id === reference.entryId,
                );
                if (!target) continue;
                const relationship = relationships.find(
                    ({ targetLayer }) => targetLayer === target.layer,
                );
                const select = relationship
                    ? form.elements[`relationship:${relationship.id}`]
                    : null;
                const option = select
                    ? Array.from(select.options).find(
                          ({ value }) => value === target.id,
                      )
                    : null;
                if (option) option.selected = true;
            }
        }
    };
    const syncPronunciation = () => {
        const control = form.elements["field:pronunciation"];
        if (!control) return;
        const selectedPronunciation = (form.compositionOrder ?? [])
            .map((id) => entries.find((entry) => entry.id === id))
            .map((entry) => derivedPronunciation(entry, entries, schema))
            .join("");
        const inputPronunciation = Array.from(input.value.trim())
            .map((character) =>
                entries.find((entry) => {
                    const entryLayer = layerForEntry([schema], entry);
                    return (
                        entryLayer?.semanticRole === "atomicWritingUnit" &&
                        entry.label === character
                    );
                }),
            )
            .map((entry) => derivedPronunciation(entry, entries, schema))
            .join("");
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
        inferRelationships();
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
        const matches = candidates
            .filter((candidate) => text.includes(candidate.label))
            .sort((left, right) => right.label.length - left.label.length);
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
