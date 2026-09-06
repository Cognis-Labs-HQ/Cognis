import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { showToast } from "/static/reuse/toast.js";
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
} from "/static/gateways/study/ui/library-client.js";
import {
    buildLibraryUrl,
    parseLanguageCode,
} from "/static/gateways/study/ui/language.js";

const DETAIL_FLOW = "study:library:composeEntryDetail";

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

function layerForEntry(schemas, entry) {
    return schemas
        .find((schema) => schema.id === entry.schemaId)
        ?.layers.find((layer) => layer.id === entry.layer);
}

function definitionText(entry, layer, languageCode) {
    const translationsField = layer?.definitionLocalization?.translationsField;
    const translations = entry.fields?.[translationsField];
    if (!translations || typeof translations !== "object") return entry.label;
    return (
        translations[parseLanguageCode(document.documentElement.lang)] ??
        translations[parseLanguageCode(languageCode)] ??
        translations.en ??
        entry.label
    );
}

function metadataFields(layer) {
    return (layer?.fields ?? []).filter(
        (field) => field.detail?.renderer === "badge" && !field.detail.hidden,
    );
}

function metadataValues(entry, layer) {
    return metadataFields(layer).flatMap((field) => {
        const raw = entry.fields?.[field.id];
        const values = Array.isArray(raw) ? raw : [raw];
        return values
            .filter(
                (value) =>
                    value !== undefined &&
                    value !== null &&
                    typeof value !== "object",
            )
            .map((value) => ({ field, value: String(value) }));
    });
}

function renderMetadataPills(entry, layer) {
    const pills = metadataValues(entry, layer);
    if (!pills.length) return "";
    return `<div class="library-metadata-pills">${pills
        .map(
            ({ value }) =>
                `<span class="library-metadata-pill">${escapeHtml(value)}</span>`,
        )
        .join("")}</div>`;
}

function scopeLabel(entry, i18n) {
    if (entry.scope === "class") {
        const className = entry.fields?.className ?? entry.scopeId;
        return i18n
            .t("gateway.study.library_scope_class")
            .replace("{{ class name }}", String(className));
    }
    return i18n.t(`gateway.study.library_scope_${entry.scope}`);
}

function renderScope(entry, i18n) {
    const icon =
        entry.scope === "global"
            ? "globe"
            : entry.scope === "class"
              ? "class"
              : "user";
    const label = scopeLabel(entry, i18n);
    return `<span class="library-scope" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"><picture><source media="(prefers-color-scheme: dark)" srcset="/static/adapters/study/library/assets/scope-${icon}-dark.svg"><img src="/static/adapters/study/library/assets/scope-${icon}-light.svg" alt=""></picture></span>`;
}

function relationSection(title, entries, emptyLabel) {
    return `<section class="library-detail-section"><h3>${escapeHtml(title)}</h3>${entries.length ? `<div class="library-related-entries">${entries.map((entry) => `<button class="library-related-entry btn-neutral" type="button" ${entryAttributes(entry)}>${escapeHtml(entry.label)}</button>`).join("")}</div>` : `<p>${escapeHtml(emptyLabel)}</p>`}</section>`;
}

function coreSections(detail, schemas, i18n, languageCode) {
    const { entry, references = [], usedBy = [] } = detail;
    const layer = layerForEntry(schemas, entry);
    const definitions = references.filter(
        (candidate) =>
            layerForEntry(schemas, candidate)?.semanticRole === "definition",
    );
    const components = references.filter(
        (candidate) =>
            layerForEntry(schemas, candidate)?.semanticRole !== "definition",
    );
    const fields = entry.fields ?? {};
    const metadataIds = new Set(metadataFields(layer).map(({ id }) => id));
    const reserved = new Set([
        "definitions",
        "alternateDefinitions",
        "provenance",
        "scope",
        "revisions",
        "progress",
        "strokes",
        ...metadataIds,
    ]);
    const genericFields = Object.fromEntries(
        Object.entries(fields).filter(([key]) => !reserved.has(key)),
    );
    const definitionContent = definitions.length
        ? definitions
              .map(
                  (definition) =>
                      `<p>${escapeHtml(definitionText(definition, layerForEntry(schemas, definition), languageCode))}</p>`,
              )
              .join("")
        : renderValue(fields.definitions ?? entry.definitions);
    return [
        `<header class="library-detail-summary">${definitionContent}<div class="library-entry-indicators">${renderMetadataPills(entry, layer)}${renderScope(entry, i18n)}</div></header>`,
        section(i18n.t("gateway.study.library_fields"), genericFields),
        section(
            i18n.t("gateway.study.library_alternate_definitions"),
            fields.alternateDefinitions ?? entry.alternateDefinitions,
        ),
        section(
            i18n.t("gateway.study.library_provenance"),
            fields.provenance ?? entry.provenance,
        ),
        section(
            i18n.t("gateway.study.library_revisions"),
            fields.revisions ?? entry.revisions,
        ),
        relationSection(
            i18n.t("gateway.study.library_components"),
            components,
            i18n.t("gateway.study.library_no_relationships"),
        ),
        relationSection(
            i18n.t("gateway.study.library_used_by"),
            usedBy.filter(
                (candidate) =>
                    layerForEntry(schemas, candidate)?.semanticRole !==
                    "definition",
            ),
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

async function composeDetail(detail, schemas, i18n, languageCode) {
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
    const layer = layerForEntry(schemas, detail.entry);
    const actions =
        layer?.semanticRole === "particle"
            ? []
            : (flow.stageResults.actions ?? []).flatMap((contribution) =>
                  Array.isArray(contribution?.actions)
                      ? contribution.actions
                      : [],
              );
    const sections = [
        ...sectionsFor("beforeCore"),
        ...coreSections(detail, schemas, i18n, languageCode),
        ...sectionsFor("core"),
        ...sectionsFor("afterCore"),
    ];
    return {
        body: `<div class="library-detail">${sections.join("")}</div>`,
        actions,
    };
}

function filterDescriptors(layer, layerEntries, contentLanguage) {
    return metadataFields(layer).flatMap((field) => {
        const values = [
            ...new Set(
                layerEntries.flatMap((entry) =>
                    metadataValues(entry, layer)
                        .filter((item) => item.field.id === field.id)
                        .map(({ value }) => value),
                ),
            ),
        ].sort((left, right) => left.localeCompare(right));
        return values.length
            ? [
                  {
                      id: field.id,
                      label: localizedLabel(field.metadata, contentLanguage),
                      values,
                  },
              ]
            : [];
    });
}

function renderLayerFilters(layer, layerEntries, i18n, contentLanguage) {
    const filters = filterDescriptors(layer, layerEntries, contentLanguage);
    if (!filters.length) return "";
    return `<div class="library-filters" aria-label="${escapeHtml(i18n.t("gateway.study.library_filters"))}">${filters
        .map(
            (filter) =>
                `<label><span>${escapeHtml(filter.label)}</span><select data-library-filter="${escapeHtml(filter.id)}"><option value="">${escapeHtml(i18n.t("ui.reuse.all"))}</option>${filter.values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}</select></label>`,
        )
        .join("")}</div>`;
}

function renderBrowser(schemas, entries, i18n) {
    if (!schemas.length)
        return `<p>${escapeHtml(i18n.t("gateway.study.library_empty"))}</p>`;
    return schemas
        .map((schema, schemaIndex) => {
            const schemaLabel = localizedLabel(
                schema.metadata,
                schema.language,
            );
            const visibleLayers = schema.layers.filter(
                (layer) =>
                    layer.semanticRole !== "definition" &&
                    layer.semanticRole !== "particle",
            );
            const tabs = visibleLayers
                .map((layer, layerIndex) => {
                    const layerLabel = localizedLabel(
                        layer.metadata,
                        schema.language,
                    );
                    return `<button class="library-layer-tab btn-neutral${layerIndex === 0 ? " active" : ""}" type="button" role="tab" id="library-tab-${schemaIndex}-${layerIndex}" aria-selected="${layerIndex === 0}" aria-controls="library-panel-${schemaIndex}-${layerIndex}" data-library-tab="${escapeHtml(layer.id)}">${escapeHtml(layerLabel)}</button>`;
                })
                .join("");
            const panels = visibleLayers
                .map((layer, layerIndex) => {
                    const layerEntries = entries.filter(
                        (entry) =>
                            entry.schemaId === schema.id &&
                            entry.layer === layer.id,
                    );
                    const cards = layerEntries.length
                        ? layerEntries
                              .map((entry) => {
                                  const filterValues = Object.fromEntries(
                                      metadataFields(layer).map((field) => [
                                          field.id,
                                          metadataValues(entry, layer)
                                              .filter(
                                                  (item) =>
                                                      item.field.id ===
                                                      field.id,
                                              )
                                              .map(({ value }) => value),
                                      ]),
                                  );
                                  return `<button class="library-entry-card btn-neutral" type="button" ${entryAttributes(entry)} data-library-filter-values="${escapeHtml(JSON.stringify(filterValues))}"><strong>${escapeHtml(entry.label)}</strong><span class="library-entry-indicators">${renderMetadataPills(entry, layer)}${renderScope(entry, i18n)}</span></button>`;
                              })
                              .join("")
                        : `<p class="library-layer-empty">${escapeHtml(i18n.t("gateway.study.library_layer_empty"))}</p>`;
                    return `<section class="library-layer-panel" role="tabpanel" id="library-panel-${schemaIndex}-${layerIndex}" aria-labelledby="library-tab-${schemaIndex}-${layerIndex}" data-library-panel="${escapeHtml(layer.id)}"${layerIndex === 0 ? "" : " hidden"}>${renderLayerFilters(layer, layerEntries, i18n, schema.language)}<div class="library-entry-grid">${cards}</div><p class="library-filter-empty" hidden>${escapeHtml(i18n.t("gateway.study.library_filter_empty"))}</p></section>`;
                })
                .join("");
            return `<section class="library-schema"><h2>${escapeHtml(schemaLabel)}</h2><div class="library-layer-tabs" role="tablist" aria-label="${escapeHtml(i18n.t("gateway.study.library_layers"))}">${tabs}</div>${panels}</section>`;
        })
        .join("");
}

async function openEntryPopup(
    initialEntry,
    schemas,
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
        const composed = await composeDetail(
            detail,
            schemas,
            i18n,
            languageCode,
        );
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
                    `<section class="library-browser">${renderBrowser(schemas, entries, i18n)}</section>`,
            },
        ],
        preferenceKey: "study-library-layout",
        i18n,
        pageContext: {
            title: i18n.t("gateway.study.library_label"),
            subtitle: i18n.t("gateway.study.library_subtitle"),
        },
        toolbar: [],
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
    root.addEventListener(
        "change",
        (event) => {
            const filter = event.target.closest("select[data-library-filter]");
            if (!filter) return;
            const panel = filter.closest("[data-library-panel]");
            const selectedFilters = Array.from(
                panel.querySelectorAll("select[data-library-filter]"),
            ).filter((item) => item.value);
            let visibleCount = 0;
            panel.querySelectorAll(".library-entry-card").forEach((card) => {
                const values = JSON.parse(card.dataset.libraryFilterValues);
                const visible = selectedFilters.every((item) =>
                    values[item.dataset.libraryFilter]?.includes(item.value),
                );
                card.hidden = !visible;
                if (visible) visibleCount += 1;
            });
            panel.querySelector(".library-filter-empty").hidden =
                visibleCount > 0;
        },
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
                schemas,
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
