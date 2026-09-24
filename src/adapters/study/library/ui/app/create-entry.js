import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { mountHorizontalCarousels } from "/static/reuse/horizontal-carousel.js";
import {
    createLibraryEntry,
    fetchLibraryForms,
    fetchLibraryLocations,
} from "/static/gateways/study/ui/library-client.js";
import {
    bindLibraryEditorControls,
    editorBody,
    readFields,
    readReferences,
} from "./admin-interactions.js";
import { localizedLabel } from "./presentation.js";

export async function chooseCreateLayer({
    schema,
    contributions,
    preferredLayerId,
    i18n,
}) {
    const permitted = schema.layers.filter(
        (layer) => layer.semanticRole !== "atomicWritingUnit",
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
        canPublishEveryone
            ? `<label class="library-admin-checkbox"><input name="publishEveryone" type="checkbox" class="choice-checkbox"> <span>${escapeHtml(i18n.t("gateway.study.library_publish_everyone"))}</span></label>`
            : ""
    }${
        writableClasses.length && !canPublishEveryone
            ? `<label class="library-admin-checkbox"><input name="publishClass" type="checkbox" class="choice-checkbox" data-library-publish-class-toggle> <span>${escapeHtml(i18n.t("gateway.study.library_publish_class_option"))}</span></label><label data-library-class-choice hidden><span>${escapeHtml(i18n.t("gateway.study.library_class"))}</span><select name="classId">${writableClasses.map(({ scopeId }) => `<option value="${escapeHtml(scopeId)}">${escapeHtml(scopeId)}</option>`).join("")}</select></label>`
            : '<input type="hidden" name="classId" value="">'
    }<section class="library-composer-text"><label><span>${escapeHtml(i18n.t("gateway.study.library_composer_text"))}</span><input data-library-composer-text autocomplete="off" value="${escapeHtml(initialLabel)}" required></label><div data-library-composer-suggestions aria-live="polite"></div></section>`;
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
            includeHidden: constructor.allowHidden === true,
            relationshipCarousels: true,
            generatedLabel: true,
        },
    );
    let form;
    const action = await openPopup({
        title: i18n.t("gateway.study.library_create"),
        body: html,
        maxWidth: "min(72rem, 96vw)",
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
                i18n,
            );
            const publishClass = form.elements.publishClass;
            const classChoice = form.querySelector(
                "[data-library-class-choice]",
            );
            publishClass?.addEventListener("change", () => {
                if (classChoice) classChoice.hidden = !publishClass.checked;
            });
            const compositionInput = form.querySelector(
                "[data-library-composer-text]",
            );
            const relationshipPanel = form.querySelector(
                '[data-library-editor-panel="relationships"]',
            );
            const updateCarouselVisibility = () => {
                if (!relationshipPanel) return;
                relationshipPanel.hidden = !(
                    document.activeElement === compositionInput ||
                    relationshipPanel.contains(document.activeElement)
                );
            };
            compositionInput?.addEventListener(
                "focus",
                updateCarouselVisibility,
            );
            compositionInput?.addEventListener("blur", () => {
                window.setTimeout(updateCarouselVisibility, 0);
            });
            relationshipPanel?.addEventListener("focusout", () => {
                window.setTimeout(updateCarouselVisibility, 0);
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
    const scope = form.elements.publishEveryone?.checked
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
        alwaysShowDefinition:
            form.elements.alwaysShowDefinition?.checked === true,
        hidden:
            form.elements.hidden?.value === "true" ||
            form.elements.hidden?.checked === true,
    };
    try {
        return await createLibraryEntry({ scope, scopeId }, entry);
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
            ? createLibraryEntry(
                  { scope, scopeId },
                  { ...entry, allowConflict: true },
              )
            : null;
    }
}

function bindTextComposition(form, entries, layer, i18n) {
    const input = form.querySelector("[data-library-composer-text]");
    const output = form.querySelector("[data-library-composer-suggestions]");
    if (!input || !output) return { validate: () => true };
    const relationships = layer.relationships ?? [];
    const candidates = relationships.flatMap((relationship) =>
        entries
            .filter((entry) => entry.layer === relationship.targetLayer)
            .map((entry) => ({ ...entry, relationshipId: relationship.id })),
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
    const syncLabel = () => {
        const resolved = selectedLabels().join("");
        form.elements.label.value = `${resolved}${input.value.trim()}`;
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
                    `<button class="btn-neutral" type="button" data-library-suggestion="${escapeHtml(match.id)}" data-relationship="${escapeHtml(match.relationshipId)}" data-suggestion-label="${escapeHtml(match.label)}">${escapeHtml(match.label)} <small>${escapeHtml(i18n.t("gateway.study.library_composer_match"))}</small></button>`,
            )
            .join(
                "",
            )}${text && fallbackRelationship && !matches.length ? `<button class="btn-confirm library-composer-unmatched" type="button" data-library-create-unmatched="${escapeHtml(fallbackRelationship)}" data-unmatched-label="${escapeHtml(text)}">${escapeHtml(text)} — ${escapeHtml(i18n.t("gateway.study.library_composer_no_match"))}</button>` : ""}`;
        syncLabel();
    };
    input.addEventListener("input", renderSuggestions);
    form.addEventListener("change", syncLabel);
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
