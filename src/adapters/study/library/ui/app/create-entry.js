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

function locationOption(location) {
    return `${location.scope}:${location.scopeId ?? location.scope}`;
}

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
    if (!schema || !layer || !access.writable.length) return null;
    const contributedFields = contributions
        .filter(
            (item) => item.schemaId === schemaId && item.layerId === layerId,
        )
        .flatMap(({ fields }) => fields);
    const contributedById = new Map(
        contributedFields.map((field) => [field.id, field]),
    );
    const editingLayer = {
        ...layer,
        fields: (layer.fields ?? []).map(
            (field) => contributedById.get(field.id) ?? field,
        ),
    };
    const draft = {
        schemaId,
        schemaVersion: schema.version,
        layer: layerId,
        label: "",
        fields: {},
        references: [],
    };
    const locationSelect = `<label><span>${escapeHtml(i18n.t("gateway.study.library_visibility"))}</span><select name="location">${access.writable.map((location) => `<option value="${escapeHtml(locationOption(location))}">${escapeHtml(location.scope === "class" ? i18n.t("gateway.study.library_scope_class").replace("{{ class name }}", location.scopeId) : i18n.t(`gateway.study.library_scope_${location.scope}`))}</option>`).join("")}</select></label>`;
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
        },
    });
    if (action !== "create" || !form?.reportValidity()) return null;
    const [scope, scopeId] = form.elements.location.value.split(":");
    const entry = {
        ...draft,
        label: form.elements.label.value,
        fields: readFields(form, editingLayer, draft),
        references: readReferences(form, editingLayer),
        alwaysShowDefinition: form.elements.alwaysShowDefinition.checked,
        hidden: form.elements.hidden.checked,
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
