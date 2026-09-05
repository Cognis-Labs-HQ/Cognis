import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { showToast } from "/static/reuse/toast.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";
import { fetchSupportedLanguages } from "/static/reuse/system-client.js";
import {
    bindStudySubNavigation,
    loadStudySubNavigationModel,
    readSelectedStudyLanguageCode,
    renderStudySubNavigation,
} from "/static/gateways/study/ui/sub-navigation.js";
import {
    fetchLibraryEntries,
    fetchLibraryEntry,
    fetchLibrarySchemas,
    createLibraryEntry,
} from "/static/gateways/study/ui/library-client.js";
import {
    buildLibraryUrl,
    parseLanguageCode,
} from "/static/gateways/study/ui/language.js";

const DETAIL_FLOW = "study:library:composeEntryDetail";

async function openDefinitionForm(schemas, i18n) {
    const definitions = schemas.flatMap((schema) =>
        schema.layers
            .filter((layer) => layer.semanticRole === "definition")
            .map((layer) => ({ schema, layer })),
    );
    if (!definitions.length) return false;
    const languages = await fetchSupportedLanguages();
    const fields = [
        {
            name: "definition_target",
            label: i18n.t("gateway.study.library_definition_layer"),
            type: "select",
            required: true,
            options: definitions.map(({ schema, layer }) => ({
                value: `${schema.id}:${layer.id}`,
                label: `${localizedLabel(schema.metadata, schema.language)} — ${localizedLabel(layer.metadata, schema.language)}`,
            })),
        },
        ...languages.map((language) => ({
            name: `translation_${language.key}`,
            label: language.label ?? language.key,
            type: "textarea",
            required: parseLanguageCode(language.key) === "en",
        })),
    ];
    const builder = createFormBuilder(
        { i18n, escapeHtml },
        {
            formId: "library-definition-form",
            submitLabelKey: "gateway.study.library_definition_save",
            includeSubmitButton: false,
            fields,
        },
    );
    let controller;
    await openPopup({
        title: i18n.t("gateway.study.library_definition_create"),
        body: builder.render(),
        actions: [
            {
                id: "save",
                label: i18n.t("gateway.study.library_definition_save"),
                variant: "confirm",
            },
        ],
        onOpen: (overlay) => {
            controller = builder.attach(
                overlay.querySelector("#library-definition-form"),
            );
        },
        onAction: async (actionId) => {
            if (actionId !== "save" || !controller?.validateAll()) return false;
            const values = controller.getValues();
            const translations = Object.fromEntries(
                languages
                    .map(({ key }) => [
                        key,
                        values[`translation_${key}`]?.trim(),
                    ])
                    .filter(([, value]) => value),
            );
            const [schemaId, layerId] = values.definition_target.split(":");
            const { schema, layer } = definitions.find(
                (candidate) =>
                    candidate.schema.id === schemaId &&
                    candidate.layer.id === layerId,
            );
            await createLibraryEntry(
                { scope: "global" },
                {
                    schemaId: schema.id,
                    schemaVersion: schema.version,
                    layer: layer.id,
                    label: translations.en,
                    fields: {
                        [layer.definitionLocalization.translationsField]:
                            translations,
                    },
                    definitionLanguages: languages.map(({ key }) => key),
                },
            );
            return true;
        },
    });
    return true;
}

function entryAttributes(entry) {
    return `data-library-schema="${escapeHtml(entry.schemaId)}" data-library-layer="${escapeHtml(entry.layer)}" data-library-entry="${escapeHtml(entry.id)}"`;
}

function localizedLabel(metadata, contentLanguage) {
    const labels = new Map(
        Object.entries(metadata?.labels ?? {}).map(([key, value]) => [
            parseLanguageCode(key),
            value,
        ]),
    );
    for (const language of [
        document.documentElement.lang,
        ...navigator.languages,
        contentLanguage,
        "en",
    ]) {
        const code = parseLanguageCode(language);
        const label = labels.get(code) ?? labels.get(code?.split("-")[0]);
        if (label) return label;
    }
    return Object.values(metadata?.labels ?? {})[0] ?? "";
}

function renderValue(value) {
    if (value === null || value === undefined) return "";
    if (Array.isArray(value))
        return `<ul>${value.map((item) => `<li>${renderValue(item)}</li>`).join("")}</ul>`;
    if (typeof value === "object")
        return `<dl>${Object.entries(value)
            .map(
                ([key, item]) =>
                    `<dt>${escapeHtml(key)}</dt><dd>${renderValue(item)}</dd>`,
            )
            .join("")}</dl>`;
    return escapeHtml(String(value));
}

function section(title, value) {
    if (
        value === undefined ||
        value === null ||
        (Array.isArray(value) && value.length === 0)
    )
        return "";
    return `<section class="library-detail-section"><h3>${escapeHtml(title)}</h3>${renderValue(value)}</section>`;
}

function relationSection(title, entries, languageCode, emptyLabel) {
    return `<section class="library-detail-section"><h3>${escapeHtml(title)}</h3>${entries.length ? `<div class="library-related-entries">${entries.map((entry) => `<button class="library-related-entry btn-neutral" type="button" ${entryAttributes(entry)}>${escapeHtml(entry.label)}</button>`).join("")}</div>` : `<p>${escapeHtml(emptyLabel)}</p>`}</section>`;
}

function coreSections(detail, i18n, languageCode) {
    const { entry, references = [], usedBy = [] } = detail;
    const fields = entry.fields ?? {};
    const reserved = new Set([
        "definitions",
        "alternateDefinitions",
        "provenance",
        "scope",
        "revisions",
        "progress",
        "strokes",
    ]);
    const genericFields = Object.fromEntries(
        Object.entries(fields).filter(([key]) => !reserved.has(key)),
    );
    return [
        section(i18n.t("gateway.study.library_fields"), genericFields),
        section(
            i18n.t("gateway.study.library_definitions"),
            fields.definitions ?? entry.definitions,
        ),
        section(
            i18n.t("gateway.study.library_alternate_definitions"),
            fields.alternateDefinitions ?? entry.alternateDefinitions,
        ),
        section(
            i18n.t("gateway.study.library_provenance"),
            fields.provenance ?? entry.provenance,
        ),
        section(
            i18n.t("gateway.study.library_scope"),
            fields.scope ?? entry.scope,
        ),
        section(
            i18n.t("gateway.study.library_revisions"),
            fields.revisions ?? entry.revisions,
        ),
        relationSection(
            i18n.t("gateway.study.library_components"),
            references,
            languageCode,
            i18n.t("gateway.study.library_no_relationships"),
        ),
        relationSection(
            i18n.t("gateway.study.library_used_by"),
            usedBy,
            languageCode,
            i18n.t("gateway.study.library_no_relationships"),
        ),
        section(
            i18n.t("gateway.study.library_progress"),
            fields.progress ?? entry.progress,
        ),
        section(
            i18n.t("gateway.study.library_strokes"),
            fields.strokes ?? entry.strokes,
        ),
    ].filter(Boolean);
}

async function composeDetail(detail, i18n, languageCode) {
    const flow = await uiCtx.runFlow(DETAIL_FLOW, {
        detail,
        i18n,
        languageCode,
    });
    const sectionsFor = (stageId) =>
        (flow.stageResults[stageId] ?? []).flatMap((contribution) =>
            Array.isArray(contribution?.sections)
                ? contribution.sections.filter(Boolean)
                : [],
        );
    const actions = (flow.stageResults.actions ?? []).flatMap((contribution) =>
        Array.isArray(contribution?.actions) ? contribution.actions : [],
    );
    const sections = [
        ...sectionsFor("beforeCore"),
        ...coreSections(detail, i18n, languageCode),
        ...sectionsFor("core"),
        ...sectionsFor("afterCore"),
    ];
    return {
        body: `<div class="library-detail">${sections.join("")}</div>`,
        actions,
    };
}

function renderBrowser(schemas, entries, i18n, languageCode) {
    if (!schemas.length)
        return `<p>${escapeHtml(i18n.t("gateway.study.library_empty"))}</p>`;
    return schemas
        .map((schema, schemaIndex) => {
            const schemaLabel = localizedLabel(
                schema.metadata,
                schema.language,
            );
            const tabs = schema.layers
                .map((layer, layerIndex) => {
                    const layerLabel = localizedLabel(
                        layer.metadata,
                        schema.language,
                    );
                    return `<button class="library-layer-tab btn-neutral${layerIndex === 0 ? " active" : ""}" type="button" role="tab" id="library-tab-${schemaIndex}-${layerIndex}" aria-selected="${layerIndex === 0}" aria-controls="library-panel-${schemaIndex}-${layerIndex}" data-library-tab="${escapeHtml(layer.id)}">${escapeHtml(layerLabel)}</button>`;
                })
                .join("");
            const panels = schema.layers
                .map((layer, layerIndex) => {
                    const layerEntries = entries.filter(
                        (entry) =>
                            entry.schemaId === schema.id &&
                            entry.layer === layer.id,
                    );
                    const cards = layerEntries.length
                        ? layerEntries
                              .map(
                                  (entry) =>
                                      `<button class="library-entry-card btn-neutral" type="button" ${entryAttributes(entry)}><strong>${escapeHtml(entry.label)}</strong><span>${escapeHtml(i18n.t("gateway.study.library_view_details"))}</span></button>`,
                              )
                              .join("")
                        : `<p class="library-layer-empty">${escapeHtml(i18n.t("gateway.study.library_layer_empty"))}</p>`;
                    return `<section class="library-layer-panel" role="tabpanel" id="library-panel-${schemaIndex}-${layerIndex}" aria-labelledby="library-tab-${schemaIndex}-${layerIndex}" data-library-panel="${escapeHtml(layer.id)}"${layerIndex === 0 ? "" : " hidden"}><div class="library-entry-grid">${cards}</div></section>`;
                })
                .join("");
            return `<section class="library-schema"><h2>${escapeHtml(schemaLabel)}</h2><div class="library-layer-tabs" role="tablist" aria-label="${escapeHtml(i18n.t("gateway.study.library_layers"))}">${tabs}</div>${panels}</section>`;
        })
        .join("");
}

async function openEntryPopup(
    initialEntry,
    entries,
    i18n,
    languageCode,
    signal,
) {
    let selectedEntry = initialEntry;
    while (selectedEntry && !signal?.aborted) {
        const detail = await fetchLibraryEntry(selectedEntry.id);
        const active = entries.filter(
            (entry) =>
                entry.schemaId === selectedEntry.schemaId &&
                entry.layer === selectedEntry.layer,
        );
        const index = active.findIndex(
            (entry) => entry.id === selectedEntry.id,
        );
        const composed = await composeDetail(detail, i18n, languageCode);
        signal?.throwIfAborted();
        let dismissPopup;
        let relatedEntry;
        const abortPopup = () => dismissPopup?.();
        signal?.addEventListener("abort", abortPopup, { once: true });
        const result = await openPopup({
            title: detail.entry.label,
            body: composed.body,
            maxWidth: "min(56rem, 94vw)",
            closeButtonVariant: "neutral",
            actions: [
                {
                    id: "previous",
                    label: `← ${i18n.t("gateway.study.library_previous")}`,
                    variant: "neutral",
                    disabled: index <= 0,
                },
                {
                    id: "next",
                    label: `${i18n.t("gateway.study.library_next")} →`,
                    variant: "neutral",
                    disabled: index < 0 || index >= active.length - 1,
                },
                ...composed.actions,
            ],
            onOpen: (overlay, dismiss) => {
                dismissPopup = dismiss;
                overlay.classList.add("library-entry-popup");
                overlay.addEventListener("click", (event) => {
                    const control = event.target.closest(
                        "button[data-library-entry]",
                    );
                    if (!control) return;
                    relatedEntry = entries.find(
                        (entry) => entry.id === control.dataset.libraryEntry,
                    );
                    void dismiss();
                });
            },
            onAction: async (actionId, overlay, popupApi) => {
                const contributedAction = composed.actions.find(
                    (action) => action.id === actionId,
                );
                if (typeof contributedAction?.onAction !== "function")
                    return true;
                return contributedAction.onAction({
                    actionId,
                    detail,
                    overlay,
                    popupApi,
                    languageCode,
                });
            },
        });
        signal?.removeEventListener("abort", abortPopup);
        if (result === "previous") selectedEntry = active[index - 1];
        else if (result === "next") selectedEntry = active[index + 1];
        else if (relatedEntry) selectedEntry = relatedEntry;
        else selectedEntry = null;
    }
}

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: [
            "/static/gateways/study/languages",
            "/static/adapters/study/library/languages",
        ],
    });
    applyDocumentTitle(i18n, "gateway.study.library_label");
    const requestedLanguageCode = readSelectedStudyLanguageCode();
    const model = await loadStudySubNavigationModel({
        fallbackLanguageCode: requestedLanguageCode,
    });
    const languageCode = model.selectedLanguageCode;
    let schemas = [];
    let entries = [];
    try {
        schemas = await fetchLibrarySchemas(languageCode);
        entries = (
            await Promise.all(
                schemas.map((schema) =>
                    fetchLibraryEntries({
                        scope: "global",
                        schemaId: schema.id,
                    }),
                ),
            )
        ).flat();
    } catch {
        showToast(i18n.t("gateway.study.library_load_error"), {
            type: "error",
        });
    }
    const composer = createPageComposer(root, {
        allowCustomization: true,
        elements: [
            {
                id: "study-library",
                label: i18n.t("gateway.study.library_label"),
                pinned: true,
                gridSize: { default: [12, 8], min: [4, 4], max: "full" },
                render: () =>
                    `<section class="library-browser">${renderBrowser(schemas, entries, i18n, languageCode)}</section>`,
            },
        ],
        preferenceKey: "study-library-layout",
        i18n,
        pageContext: {
            title: i18n.t("gateway.study.library_label"),
            subtitle: i18n.t("gateway.study.library_subtitle"),
        },
        toolbar: schemas.some((schema) =>
            schema.layers.some((layer) => layer.semanticRole === "definition"),
        )
            ? [
                  {
                      id: "library-actions",
                      label: i18n.t("gateway.study.library_definition_create"),
                      render: () =>
                          `<button class="btn-confirm" data-create-definition>${escapeHtml(i18n.t("gateway.study.library_definition_create"))}</button>`,
                  },
              ]
            : [],
        subNavigation: [
            {
                id: "study-subnav",
                label: i18n.t("gateway.study.page_title"),
                render: () =>
                    renderStudySubNavigation({
                        model,
                        currentPath: "/study/library",
                        i18n,
                    }),
            },
        ],
    });
    await composer.init();
    signal?.throwIfAborted();
    bindStudySubNavigation(root, { signal });
    root.querySelector("[data-create-definition]")?.addEventListener(
        "click",
        () => void openDefinitionForm(schemas, i18n),
        { signal },
    );
    root.addEventListener(
        "click",
        (event) => {
            const tab = event.target.closest("button[data-library-tab]");
            if (tab) {
                const schema = tab.closest(".library-schema");
                schema
                    .querySelectorAll("[data-library-tab]")
                    .forEach((item) => {
                        const active = item === tab;
                        item.classList.toggle("active", active);
                        item.setAttribute("aria-selected", String(active));
                    });
                schema
                    .querySelectorAll("[data-library-panel]")
                    .forEach((panel) => {
                        panel.hidden =
                            panel.dataset.libraryPanel !==
                            tab.dataset.libraryTab;
                    });
                return;
            }
            const control = event.target.closest("button[data-library-entry]");
            if (!control) return;
            const entry = entries.find(
                (candidate) => candidate.id === control.dataset.libraryEntry,
            );
            if (!entry) return;
            void openEntryPopup(
                entry,
                entries,
                i18n,
                languageCode,
                signal,
            ).catch(() =>
                showToast(i18n.t("gateway.study.library_load_error"), {
                    type: "error",
                }),
            );
        },
        { signal },
    );
}

await mountWhenDirect(mount);
