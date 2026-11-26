import { replaceMountScope } from "/static/reuse/mount-scope.js";
import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { formatDateTime } from "/static/reuse/timestamp.js";
import {
    bindStudySubNavigation,
    loadStudySubNavigationModel,
    createStudySubNavigationSlot,
} from "/static/gateways/study/sub-navigation.js";
import {
    dictionarySearchContext,
    fetchLibrarySchemas,
    searchLibraryDictionary,
} from "/static/gateways/study/library-client.js";
import { loadLibrary } from "../data.js";
import { loadDictionaryReferences } from "./references.js";
import { renderCardContents } from "../cards.js";
import {
    renderDetailFields,
    metadataValues,
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

let mountController = null;

export async function mount(root, { signal: routerSignal } = {}) {
    mountController = replaceMountScope(mountController, routerSignal);
    const controller = mountController;
    const signal = controller.signal;
    window.addEventListener(
        "cognis:route-will-change",
        () => controller.abort(),
        { signal, once: true },
    );
    const i18n = await createI18n({
        componentStringBaseUrls: [
            "/static/gateways/study/languages",
            "/static/adapters/study/library/languages",
        ],
    });
    if (location.search || location.hash)
        history.replaceState(history.state, "", location.pathname);
    const input = await dictionarySearchContext();
    signal.throwIfAborted();
    const model = await loadStudySubNavigationModel({
        fallbackLanguageCode: input?.language,
    });
    const schemas = await fetchLibrarySchemas(model.selectedLanguageCode);
    let entries = [];
    const selectedProvider = model.dictionaryProviders.find(
        ({ id, schemaId }) =>
            id === input?.providerId && schemaId === input?.schemaId,
    );
    let results = [],
        selected = 0,
        response,
        loading = false,
        failed = false;
    const entryFor = (result, index) => ({
        ...result,
        id: `dictionary:${index}`,
        label: result.label || input?.query,
        language: model.selectedLanguageCode,
        fields: result.fields ?? {},
    });
    const render =
        () => `<section class="library-dictionary-results" data-library-dictionary-results>
        ${results.length === 1 ? "" : `<header class="library-dictionary-heading"><h2>${escapeHtml(input?.query || i18n.t("gateway.study.library_search_results"))}</h2></header>`}
        ${loading ? `<p role="status">${escapeHtml(i18n.t("ui.reuse.loading"))}</p>` : ""}
        ${failed ? `<p role="alert">${escapeHtml(i18n.t("gateway.study.library_dictionary_error"))}</p>` : ""}
        ${response?.cached ? `<p>${escapeHtml(i18n.t("gateway.study.library_dictionary_cached").replace("{{ time }}", formatDateTime(response.cachedAt)))}</p>` : ""}
        ${
            results.length > 1
                ? `<div class="library-dictionary-cards" role="group" aria-label="${escapeHtml(i18n.t("gateway.study.library_lookup_multiple_title"))}">${results
                      .map((result, index) => {
                          const entry = entryFor(result, index),
                              schema = schemas.find(
                                  ({ id }) => id === result.schemaId,
                              ),
                              layer = layerForEntry(schemas, entry);
                          const hasDefinition = entries.some(
                              (candidate) =>
                                  (entry.references ?? []).some(
                                      ({ entryId }) => entryId === candidate.id,
                                  ) &&
                                  isMeaningLayer(
                                      layerForEntry(schemas, candidate),
                                  ),
                          );
                          const definition = !hasDefinition
                              ? localizedTextValue(
                                    result.definitions?.[0]?.translations ?? {},
                                )
                              : "";
                          return `<button class="library-entry-card btn-neutral${index === selected ? " active" : ""}" type="button" data-dictionary-result="${index}" aria-pressed="${index === selected}">${renderCardContents(entry, layer, entries, schema, i18n)}${definition ? `<span class="library-card-definition">${escapeHtml(definition)}</span>` : ""}</button>`;
                      })
                      .join("")}</div>`
                : ""
        }
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
                      const related = entries.filter(({ id }) =>
                          relatedIds.has(id),
                      );
                      const metadata = [
                          ...new Set([
                              ...metadataValues(entry, layer).map(
                                  ({ value }) => value,
                              ),
                              ...(result.tags ?? []).filter(
                                  (tag) =>
                                      tag !== result.class &&
                                      !String(tag).startsWith("jlpt-"),
                              ),
                          ]),
                      ];
                      return `<section class="library-dictionary-detail"><h3>${escapeHtml(entry.label)}</h3>
                ${metadata.length ? `<div class="library-metadata-pills">${metadata.map((tag) => `<span class="library-metadata-pill">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
                ${renderDetailFields(
                    Object.fromEntries(
                        visibleDetailFields(layer)
                            .filter(
                                (field) =>
                                    field.id !== layer?.detail?.titleField &&
                                    field.id !== layer?.detail?.subtitleField &&
                                    field.detail?.renderer !== "badge",
                            )
                            .filter((field) => {
                                const value = entry.fields[field.id];
                                return (
                                    value !== undefined &&
                                    value !== null &&
                                    value !== "" &&
                                    (!Array.isArray(value) || value.length > 0)
                                );
                            })
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
                ${result.definitions?.length ? `<h4>${escapeHtml(i18n.t("gateway.study.library_definitions"))}</h4>` : ""}
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
                    related.length
                        ? relationSection(
                              i18n.t("gateway.study.library_relation_parents"),
                              related,
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
    const refreshResults = () => {
        const previous =
            root.querySelector(".library-dictionary-cards")?.scrollLeft ?? 0;
        root.querySelector("[data-library-dictionary-results]").outerHTML =
            render();
        const slider = root.querySelector(".library-dictionary-cards");
        if (slider) slider.scrollLeft = previous;
    };
    const search = async () => {
        if (loading) return;
        loading = true;
        failed = false;
        refreshResults();

        try {
            if (!selectedProvider)
                throw new Error("lookup_provider_not_searchable");
            response = await searchLibraryDictionary(input);
            signal?.throwIfAborted();
            results = response.results;
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
        } catch (error) {
            if (!signal?.aborted) {
                results = [];
                entries = [];
                response = undefined;
                failed = true;
                showToast(i18n.t("gateway.study.library_dictionary_error"), {
                    variant: "error",
                });
            }
        } finally {
            loading = false;
            if (!signal?.aborted) {
                refreshResults();
            }
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
            subtitle: i18n.t("gateway.study.library_search_results_subtitle"),
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
        subNavigation: [createStudySubNavigationSlot(model, i18n)],
    });
    await composer.init();
    signal?.throwIfAborted();
    bindStudySubNavigation(root, { signal, i18n });
    root.addEventListener(
        "click",
        async (event) => {
            if (loading) return;
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
                refreshResults();
            }
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
                        initialLabel: result.label || input?.query,
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
    if (input) await search();
}

await mountWhenDirect(mount);
