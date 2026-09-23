import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import {
    createLibraryEntry,
    fetchLibraryForms,
    fetchLibraryLocations,
} from "/static/gateways/study/ui/library-client.js";
import {
    editorBody,
    readFields,
    readReferences,
} from "./admin-interactions.js";
import { localizedLabel } from "./presentation.js";

export async function openCreateEntryPopup({
    schemas,
    entries,
    schemaId,
    layerId,
    i18n,
}) {
    const [access, contributions] = await Promise.all([
        fetchLibraryLocations(),
        fetchLibraryForms(),
    ]);
    const schema = schemas.find(({ id }) => id === schemaId);
    const layer = schema?.layers.find(({ id }) => id === layerId);
    const constructor = layer?.cardConstructor;
    if (!schema || !layer || !constructor || !access.writable.length)
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
        label: "",
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
    }`;
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
                variant: "neutral",
            },
        ],
        onMount(overlay) {
            form = overlay.querySelector("[data-library-admin-editor]");
            builder.attach(form);
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
    if (action !== "create" || !form?.reportValidity()) return null;
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
                    variant: "neutral",
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
