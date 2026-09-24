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
        fetchLibraryLocations(),
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
    const writableScopes = [
        ...new Set(access.writable.map(({ scope }) => scope)),
    ];
    const writableClasses = access.writable.filter(
        ({ scope }) => scope === "class",
    );
    const locationSelect = `<label><span>${escapeHtml(i18n.t("gateway.study.library_visibility"))}</span><select name="scope" data-library-visibility>${writableScopes.map((scope) => `<option value="${escapeHtml(scope)}">${escapeHtml(i18n.t(`gateway.study.library_scope_${scope}`))}</option>`).join("")}</select></label>${
        writableClasses.length > 1
            ? `<label data-library-class-choice hidden><span>${escapeHtml(i18n.t("gateway.study.library_class"))}</span><select name="classId">${writableClasses.map(({ scopeId }) => `<option value="${escapeHtml(scopeId)}">${escapeHtml(scopeId)}</option>`).join("")}</select></label>`
            : `<input type="hidden" name="classId" value="${escapeHtml(writableClasses[0]?.scopeId ?? "")}">`
    }${layer.relationships?.length ? `<section class="library-composer-text"><label><span>${escapeHtml(i18n.t("gateway.study.library_composer_text"))}</span><input data-library-composer-text autocomplete="off"></label><div data-library-composer-suggestions aria-live="polite"></div></section>` : ""}`;
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
        locationSelect,
        {
            labelText:
                localizedLabel(constructor.label, schema.language) ||
                i18n.t("gateway.study.library_admin_label"),
            includeAlwaysShowDefinition:
                constructor.allowAlwaysShowDefinition === true,
            includeHidden: constructor.allowHidden === true,
            relationshipCarousels: true,
        },
    );
    let form;
    const action = await openPopup({
        title: i18n.t("gateway.study.library_create"),
        body: html,
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
        onMount(overlay) {
            form = overlay.querySelector("[data-library-admin-editor]");
            builder.attach(form);
            bindLibraryEditorControls(form, draft, i18n);
            const controller = new AbortController();
            overlay.addEventListener("close", () => controller.abort(), {
                once: true,
            });
            mountHorizontalCarousels(form, {
                signal: controller.signal,
                onChange: ({ id, values }) => {
                    const select = form.elements[`relationship:${id}`];
                    if (!select) return;
                    const selected = new Set(values);
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
                    const created = await openCreateEntryPopup({
                        schemas,
                        entries,
                        schemaId,
                        layerId: relationship.targetLayer,
                        i18n,
                        contributions,
                        initialLabel: carousel.dataset.suggestedLabel ?? "",
                    });
                    delete carousel.dataset.suggestedLabel;
                    if (!created) return;
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
            bindTextComposition(form, entries, editingLayer, i18n);
            const visibility = form.elements.scope;
            const classChoice = form.querySelector(
                "[data-library-class-choice]",
            );
            const updateClassChoice = () => {
                if (classChoice)
                    classChoice.hidden = visibility.value !== "class";
            };
            visibility.addEventListener("change", updateClassChoice);
            updateClassChoice();
        },
    });
    if (
        action !== "create" ||
        form?.querySelector('[data-uploading="true"]') ||
        !form?.reportValidity()
    )
        return null;
    const scope = form.elements.scope.value;
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
    if (!input || !output) return;
    const candidates = (layer.relationships ?? []).flatMap((relationship) =>
        entries
            .filter((entry) => entry.layer === relationship.targetLayer)
            .map((entry) => ({ ...entry, relationshipId: relationship.id })),
    );
    input.addEventListener("input", () => {
        let remainder = input.value.trim();
        const matches = [];
        for (const candidate of [...candidates].sort(
            (left, right) => right.label.length - left.label.length,
        )) {
            if (!remainder.includes(candidate.label)) continue;
            matches.push(candidate);
            remainder = remainder.replace(candidate.label, "").trim();
        }
        const fallbackRelationship = layer.relationships?.[0]?.id;
        output.innerHTML = `${matches
            .map(
                (match) =>
                    `<button class="btn-neutral" type="button" data-library-suggestion="${escapeHtml(match.id)}" data-relationship="${escapeHtml(match.relationshipId)}">${escapeHtml(match.label)} <small>${escapeHtml(i18n.t("gateway.study.library_composer_match"))}</small></button>`,
            )
            .join(
                "",
            )}${remainder && fallbackRelationship ? `<button class="btn-confirm library-composer-unmatched" type="button" data-library-create-unmatched="${escapeHtml(fallbackRelationship)}" data-unmatched-label="${escapeHtml(remainder)}">${escapeHtml(remainder)} — ${escapeHtml(i18n.t("gateway.study.library_composer_no_match"))}</button>` : ""}`;
    });
    output.addEventListener("click", (event) => {
        const suggestion = event.target.closest("[data-library-suggestion]");
        if (suggestion) {
            form.querySelector(
                `[data-horizontal-carousel="${CSS.escape(suggestion.dataset.relationship)}"] [data-carousel-value="${CSS.escape(suggestion.dataset.librarySuggestion)}"]`,
            )?.click();
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
}
