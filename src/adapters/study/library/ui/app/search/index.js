import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { formatDateTime } from "/static/reuse/timestamp.js";
import {
    bindStudySubNavigation,
    loadStudySubNavigationModel,
    renderStudySubNavigation,
} from "/static/gateways/study/ui/sub-navigation.js";
import {
    fetchLibrarySchemas,
    searchLibraryDictionary,
} from "/static/gateways/study/ui/library-client.js";
import { loadLibrary } from "../data.js";
import { loadDictionaryReferences } from "./references.js";
import { renderCardContents } from "../cards.js";
import {
    renderDetailFields,
    renderMetadataPills,
    layerForEntry,
    localizedTextValue,
    relationSection,
    isMeaningLayer,
    visibleDetailFields,
} from "../presentation.js";
import { resolveLookupReferences } from "../create-entry/lookup-references.js";
import { openEntryPopup } from "../entry-popup.js";
import { canCreateLayerEntries } from "../editability.js";
import { openCreateEntryPopup } from "../create-entry/index.js";

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: [
            "/static/gateways/study/languages",
            "/static/adapters/study/library/languages",
        ],
    });
    const parameters = new URLSearchParams(location.search);
    const model = await loadStudySubNavigationModel({
        fallbackLanguageCode: parameters.get("language"),
    });
    const schemas = await fetchLibrarySchemas(model.selectedLanguageCode);
    let entries = [];
    const input = {
        providerId: parameters.get("providerId"),
        schemaId: parameters.get("schemaId"),
        query: parameters.get("query") || "",
    };
    const selectedProvider = model.dictionaryProviders.find(
        ({ id, schemaId }) =>
            id === input.providerId && schemaId === input.schemaId,
    );
    let results = [],
        selected = 0,
        response;
    const entryFor = (result, index) => ({
        ...result,
        id: `dictionary:${index}`,
        label: result.label || input.query,
        language: model.selectedLanguageCode,
        fields: result.fields ?? {},
    });
    const render =
        () => `<section class="library-dictionary-results" data-library-dictionary-results>
        <h2>${escapeHtml(input.query)}</h2>
        ${response?.cached ? `<p>${escapeHtml(i18n.t("gateway.study.library_dictionary_cached").replace("{{ time }}", formatDateTime(response.cachedAt)))}</p>` : ""}
        <div class="library-dictionary-cards">${results
            .map((result, index) => {
                const entry = entryFor(result, index),
                    schema = schemas.find(({ id }) => id === result.schemaId),
                    layer = layerForEntry(schemas, entry);
                const hasDefinition = entries.some(
                    (candidate) =>
                        (entry.references ?? []).some(
                            ({ entryId }) => entryId === candidate.id,
                        ) && isMeaningLayer(layerForEntry(schemas, candidate)),
                );
                const definition = !hasDefinition
                    ? localizedTextValue(
                          result.definitions?.[0]?.translations ?? {},
                      )
                    : "";
                return `<button class="library-entry-card btn-neutral${index === selected ? " active" : ""}" type="button" data-dictionary-result="${index}" aria-pressed="${index === selected}">${renderCardContents(entry, layer, entries, schema, i18n)}${definition ? `<span class="library-card-definition">${escapeHtml(definition)}</span>` : ""}</button>`;
            })
            .join("")}</div>
        ${
            results.length
                ? (() => {
                      const result = results[selected],
                          entry = entryFor(result, selected),
                          layer = layerForEntry(schemas, entry);
                      const relatedIds = new Set(
                          [
                              ...(entry.references ?? []),
                              ...Object.values(
                                  entry.referenceGroups ?? {},
                              ).flat(2),
                          ].map(({ entryId }) => entryId),
                      );
                      return `<section class="library-dictionary-detail"><h3>${escapeHtml(entry.label)}</h3>${renderMetadataPills(entry, layer)}
                <div class="library-metadata-pills">${[
                    result.class,
                    ...(result.tags ?? []),
                ]
                    .filter(Boolean)
                    .map(
                        (tag) =>
                            `<span class="library-metadata-pill">${escapeHtml(tag)}</span>`,
                    )
                    .join("")}</div>
                ${renderDetailFields(
                    Object.fromEntries(
                        visibleDetailFields(layer)
                            .filter(
                                (field) => entry.fields[field.id] !== undefined,
                            )
                            .map((field) => [
                                field.metadata?.labels?.[
                                    document.documentElement.lang
                                ] ||
                                    field.metadata?.labels?.en ||
                                    field.id,
                                entry.fields[field.id],
                            ]),
                    ),
                )}
                <ul>${(result.definitions ?? [])
                    .map(
                        (definition) =>
                            `<li>${escapeHtml(
                                Object.entries(definition.translations ?? {})
                                    .map(
                                        ([language, value]) =>
                                            `${language}: ${value}`,
                                    )
                                    .join(" · "),
                            )}</li>`,
                    )
                    .join("")}</ul>
                ${
                    relatedIds.size
                        ? relationSection(
                              i18n.t("gateway.study.library_relation_parents"),
                              entries.filter(({ id }) => relatedIds.has(id)),
                              "",
                          )
                        : ""
                }
                ${canCreateLayerEntries(layer) ? `<button class="btn-confirm" type="button" data-dictionary-create>${escapeHtml(i18n.t("gateway.study.library_create"))}</button>` : ""}</section>`;
                  })()
                : response
                  ? `<p>${escapeHtml(i18n.t("gateway.study.library_lookup_empty"))}</p>`
                  : ""
        }
    </section>`;
    const search = async (refresh = false) => {
        const button = root.querySelector("[data-dictionary-refresh]");
        if (button) button.disabled = true;
        try {
            if (!selectedProvider)
                throw new Error("lookup_provider_not_searchable");
            response = await searchLibraryDictionary({ ...input, refresh });
            signal?.throwIfAborted();
            results = response.results;
            const target = root.querySelector(
                "[data-library-dictionary-results]",
            );
            selected = 0;
            if (target) target.outerHTML = render();
            entries = await loadDictionaryReferences(results, schemas);
            signal?.throwIfAborted();
            results = response.results.map((result) => {
                const schema = schemas.find(({ id }) => id === result.schemaId);
                const layer = schema.layers.find(
                    ({ id }) => id === result.layer,
                );
                return {
                    ...resolveLookupReferences(result, entries, schema, layer)
                        .suggestion,
                    schemaId: result.schemaId,
                    layer: result.layer,
                };
            });
            selected = 0;
            root.querySelector("[data-library-dictionary-results]").outerHTML =
                render();
        } catch (error) {
            if (!signal?.aborted)
                showToast(i18n.t("gateway.study.library_dictionary_error"), {
                    variant: "error",
                });
        } finally {
            if (button) button.disabled = false;
        }
    };
    applyDocumentTitle(i18n, "gateway.study.library_search_results");
    const composer = createPageComposer(root, {
        allowCustomization: false,
        contentScrolling: false,
        preferenceKey: "study-library-search-layout",
        i18n,
        pageContext: {
            title: i18n.t("gateway.study.library_search_results"),
            subtitle: "",
        },
        elements: [
            {
                id: "dictionary-results",
                label: i18n.t("gateway.study.library_search_results"),
                pinned: true,
                width: "fill",
                gridSize: { default: [12, 8], min: [4, 4], max: "full" },
                render,
            },
        ],
        toolbar: [
            {
                id: "dictionary-refresh",
                label: i18n.t("ui.reuse.refresh"),
                render: () =>
                    `<button class="btn-neutral" type="button" data-dictionary-refresh>${escapeHtml(i18n.t("ui.reuse.refresh"))}</button>`,
            },
        ],
        subNavigation: [
            {
                id: "study-subnav",
                label: i18n.t("gateway.study.page_title"),
                render: () =>
                    renderStudySubNavigation({
                        model,
                        currentPath: location.pathname,
                        i18n,
                    }),
            },
        ],
    });
    await composer.init();
    signal?.throwIfAborted();
    bindStudySubNavigation(root, { signal });
    root.addEventListener(
        "click",
        async (event) => {
            const related = event.target.closest("[data-library-entry]");
            if (related) {
                try {
                    const full = await loadLibrary(
                        model.selectedLanguageCode,
                        i18n,
                    );
                    const entry = full.entries.find(
                        ({ id }) => id === related.dataset.libraryEntry,
                    );
                    if (entry) {
                        await openEntryPopup(
                            root,
                            entry,
                            schemas,
                            full.entries,
                            i18n,
                            model.selectedLanguageCode,
                            signal,
                            { readOnly: true },
                        );
                    }
                } catch {
                    showToast(i18n.t("gateway.study.library_load_error"), {
                        variant: "error",
                    });
                }
                return;
            }
            const result = event.target.closest("[data-dictionary-result]");
            if (result) {
                selected = Number(result.dataset.dictionaryResult);
                root.querySelector(
                    "[data-library-dictionary-results]",
                ).outerHTML = render();
            }
            if (event.target.closest("[data-dictionary-refresh]"))
                await search(true);
            const create = event.target.closest("[data-dictionary-create]");
            if (create && !create.disabled) {
                create.disabled = true;
                try {
                    const result = results[selected];
                    const full = await loadLibrary(
                        model.selectedLanguageCode,
                        i18n,
                    );
                    await openCreateEntryPopup({
                        schemas,
                        entries: full.entries,
                        schemaId: result.schemaId,
                        layerId: result.layer,
                        i18n,
                        initialLabel: result.label || input.query,
                        initialLookup: {
                            providerId: input.providerId,
                            suggestion: result,
                        },
                    });
                } catch {
                    showToast(i18n.t("gateway.study.library_create_error"), {
                        variant: "error",
                    });
                } finally {
                    create.disabled = false;
                }
            }
        },
        { signal },
    );
    await search();
}

await mountWhenDirect(mount);
