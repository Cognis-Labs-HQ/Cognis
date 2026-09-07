import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { showToast } from "/static/reuse/toast.js";
import { groupByToMap } from "/static/reuse/group-by.js";
import { highlightSearchTarget } from "/static/reuse/search-util/indexing.js";
import {
    bindStudySubNavigation,
    loadStudySubNavigationModel,
    readSelectedStudyLanguageCode,
    renderStudySubNavigation,
} from "/static/gateways/study/ui/sub-navigation.js";
import {
    deleteLibraryEntries,
    fetchLibraryAudioUrl,
    fetchLibraryEntries,
    fetchLibraryEntry,
    fetchLibrarySchemas,
} from "/static/gateways/study/ui/library-client.js";
import {
    buildLibraryUrl,
    isAdminScope,
    parseLanguageCode,
} from "/static/gateways/study/ui/language.js";

const DETAIL_FLOW = "study:library:composeEntryDetail";
const LONG_PRESS_DURATION_MS = 550;
const LONG_PRESS_MOVE_TOLERANCE_PX = 8;

function entryAttributes(entry) {
    return `data-library-schema="${escapeHtml(entry.schemaId)}" data-library-layer="${escapeHtml(entry.layer)}" data-library-entry="${escapeHtml(entry.id)}"`;
}

function entrySearchAttribute(entry) {
    return `data-search-id="library-entry-${escapeHtml(entry.id)}"`;
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
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === "object" && Object.keys(value).length === 0)
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
    return `<section class="library-detail-section"><h3>${escapeHtml(title)}</h3>${entries.length ? `<div class="library-related-entries">${entries.map((entry) => renderEntryLink(entry, "library-related-entry btn-neutral")).join("")}</div>` : `<p>${escapeHtml(emptyLabel)}</p>`}</section>`;
}

function renderEntryLink(entry, className, label = entry.label) {
    return `<button class="${className}" type="button" ${entryAttributes(entry)} data-library-preview="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
}

function isMeaningLayer(layer) {
    return (
        layer?.semanticRole === "definition" ||
        layer?.semanticRole === "meaning"
    );
}

function isWritingUnitLayer(layer) {
    return (
        layer?.semanticRole === "atomicWritingUnit" ||
        layer?.semanticRole === "compoundWritingUnit"
    );
}

function pronunciationValues(entry) {
    const pronunciation = entry.fields?.pronunciation;
    if (!pronunciation) return [];
    return (Array.isArray(pronunciation) ? pronunciation : [pronunciation]).map(
        (value) => String(value),
    );
}

function compositionReferenceGroups(detail, schemas, contentLanguage) {
    const sourceLayer = layerForEntry(schemas, detail.entry);
    const entriesById = new Map(
        (detail.references ?? []).map((entry) => [entry.id, entry]),
    );
    return (sourceLayer?.relationships ?? [])
        .filter((relationship) => relationship.resolverRole)
        .map((relationship) => ({
            id: relationship.id,
            label: localizedLabel(relationship.metadata, contentLanguage),
            entries: (detail.entry.references ?? [])
                .filter((reference) => reference.relation === relationship.id)
                .sort(
                    (left, right) =>
                        (left.position ?? 0) - (right.position ?? 0),
                )
                .map((reference) => entriesById.get(reference.entryId))
                .filter(
                    (entry) =>
                        entry && !isMeaningLayer(layerForEntry(schemas, entry)),
                ),
        }))
        .filter((group) => group.entries.length);
}

function renderCompositionGroups(groups) {
    return groups
        .map(
            (group) =>
                `<section class="library-composition" data-library-composition="${escapeHtml(group.id)}"><span class="library-composition-label">${escapeHtml(group.label)}</span><div class="library-component-boxes">${group.entries
                    .map(
                        (entry, index) =>
                            `${index ? '<span class="library-composition-operator" aria-hidden="true">+</span>' : ""}${renderEntryLink(entry, "library-component-box btn-neutral")}`,
                    )
                    .join("")}</div></section>`,
        )
        .join("");
}

function renderPronunciation(entry, layer) {
    const values = pronunciationValues(entry);
    if (!values.length || isWritingUnitLayer(layer)) return "";
    return `<p class="library-pronunciation">${values.map((value) => escapeHtml(value)).join(" · ")}</p>`;
}

function detailTitlePronunciation(entry, layer) {
    const pronunciations = pronunciationValues(entry);
    return layer?.semanticRole === "atomicWritingUnit" && pronunciations.length
        ? pronunciations.join(" · ")
        : "";
}

function renderAudio(entry, layer) {
    const audioField = (layer?.fields ?? []).find(
        (field) => field.id === "audio" && field.type === "audio",
    );
    const value = audioField ? entry.fields?.[audioField.id] : undefined;
    if (typeof value !== "string" || !value) return "";
    const label = localizedLabel(audioField.metadata, entry.language);
    return `<div class="library-audio" data-library-audio-player><audio preload="none" data-library-audio-entry="${escapeHtml(entry.id)}" data-library-audio-field="${escapeHtml(audioField.id)}" aria-label="${escapeHtml(label)}"></audio><button class="library-audio-toggle btn-neutral" type="button" data-library-audio-toggle aria-label="${escapeHtml(label)}">▶</button><span class="library-audio-time" data-library-audio-time>0:00</span><input class="library-audio-progress" type="range" min="0" max="1000" value="0" step="1" data-library-audio-progress aria-label="${escapeHtml(label)}"></div>`;
}

function formatAudioTime(value) {
    const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function connectLibraryAudioControls(audio) {
    const player = audio.closest("[data-library-audio-player]");
    const toggle = player?.querySelector("[data-library-audio-toggle]");
    const progress = player?.querySelector("[data-library-audio-progress]");
    const time = player?.querySelector("[data-library-audio-time]");
    if (!player || !toggle || !progress || !time) return;

    const update = () => {
        const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
        progress.value = String(
            duration > 0
                ? Math.round((audio.currentTime / duration) * 1000)
                : 0,
        );
        time.textContent = `${formatAudioTime(audio.currentTime)} / ${formatAudioTime(duration)}`;
        toggle.textContent = audio.paused ? "▶" : "❚❚";
    };
    toggle.addEventListener("click", () => {
        if (audio.paused) void audio.play();
        else audio.pause();
    });
    progress.addEventListener("input", () => {
        if (Number.isFinite(audio.duration)) {
            audio.currentTime =
                (Number(progress.value) / 1000) * audio.duration;
        }
    });
    audio.addEventListener("loadedmetadata", update);
    audio.addEventListener("timeupdate", update);
    audio.addEventListener("play", update);
    audio.addEventListener("pause", update);
    audio.addEventListener("ended", update);
    update();
}

async function loadLibraryAudio(overlay, objectUrls, signal, errorMessage) {
    await Promise.all(
        Array.from(
            overlay.querySelectorAll(
                "audio[data-library-audio-entry][data-library-audio-field]",
            ),
            async (audio) => {
                try {
                    const objectUrl = await fetchLibraryAudioUrl(
                        audio.dataset.libraryAudioEntry,
                        audio.dataset.libraryAudioField,
                        { signal },
                    );
                    if (!audio.isConnected || signal?.aborted) {
                        URL.revokeObjectURL(objectUrl);
                        return;
                    }
                    objectUrls.add(objectUrl);
                    audio.src = objectUrl;
                    connectLibraryAudioControls(audio);
                } catch (error) {
                    if (error?.name === "AbortError" || !audio.isConnected) {
                        return;
                    }
                    const message = document.createElement("p");
                    message.className = "library-audio library-audio-error";
                    message.setAttribute("role", "status");
                    message.textContent = errorMessage;
                    audio
                        .closest("[data-library-audio-player]")
                        ?.replaceWith(message);
                }
            },
        ),
    );
}

function coreSections(detail, schemas, i18n, languageCode, resolvedDefinition) {
    const { entry, references = [], usedBy = [] } = detail;
    const layer = layerForEntry(schemas, entry);
    const definitions = references.filter((candidate) =>
        isMeaningLayer(layerForEntry(schemas, candidate)),
    );
    const compositions = compositionReferenceGroups(
        detail,
        schemas,
        entry.language,
    );
    const relatedWords = isWritingUnitLayer(layer)
        ? usedBy.filter(
              (candidate) =>
                  layerForEntry(schemas, candidate)?.semanticRole ===
                  "lexicalUnit",
          )
        : [];
    const variantChildren = usedBy.filter((candidate) => {
        const placement = variantPlacement(candidate, schemas);
        return placement?.parentId === entry.id;
    });
    const otherUsedBy = usedBy.filter(
        (candidate) =>
            !relatedWords.includes(candidate) &&
            !variantChildren.includes(candidate) &&
            layerForEntry(schemas, candidate)?.semanticRole !== "definition",
    );
    const wordLayer = relatedWords.length
        ? layerForEntry(schemas, relatedWords[0])
        : null;
    const fields = entry.fields ?? {};
    const metadataIds = new Set(metadataFields(layer).map(({ id }) => id));
    const reserved = new Set(["pronunciation", "audio", ...metadataIds]);
    const genericFields = Object.fromEntries(
        (layer?.fields ?? [])
            .filter(
                (field) =>
                    !reserved.has(field.id) &&
                    !field.detail?.hidden &&
                    field.detail?.renderer !== "badge" &&
                    fields[field.id] !== undefined &&
                    fields[field.id] !== null &&
                    fields[field.id] !== "",
            )
            .map((field) => [
                localizedLabel(field.metadata, entry.language),
                fields[field.id],
            ]),
    );
    const definitionContent = resolvedDefinition
        ? renderValue(resolvedDefinition)
        : definitions.length
          ? definitions
                .map((definition) =>
                    renderEntryLink(
                        definition,
                        "library-definition-link btn-neutral",
                        definitionText(
                            definition,
                            layerForEntry(schemas, definition),
                            languageCode,
                        ),
                    ),
                )
                .join("")
          : "";
    return [
        `<header class="library-detail-summary">${renderScope(entry, i18n)}${definitionContent}${renderPronunciation(entry, layer)}${renderAudio(entry, layer)}${renderCompositionGroups(compositions)}<div class="library-entry-indicators">${renderMetadataPills(entry, layer)}</div></header>`,
        section(i18n.t("gateway.study.library_fields"), genericFields),
        relatedWords.length
            ? relationSection(
                  i18n
                      .t("gateway.study.library_used_in_layer")
                      .replace(
                          "{{ layer }}",
                          localizedLabel(wordLayer.metadata, entry.language),
                      ),
                  relatedWords,
                  i18n.t("gateway.study.library_no_relationships"),
              )
            : "",
        otherUsedBy.length || !relatedWords.length
            ? relationSection(
                  i18n.t("gateway.study.library_used_by"),
                  otherUsedBy,
                  i18n.t("gateway.study.library_no_relationships"),
              )
            : "",
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
        ...coreSections(
            detail,
            schemas,
            i18n,
            languageCode,
            Object.values(flow.stageResults)
                .flat()
                .find(
                    (contribution) =>
                        typeof contribution?.displayDefinition === "string",
                )?.displayDefinition,
        ),
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
                      detail: field.detail,
                  },
              ]
            : [];
    });
}

function renderLayerFilters(layer, layerEntries, i18n, contentLanguage) {
    const filters = filterDescriptors(layer, layerEntries, contentLanguage);
    if (!filters.length) return "";
    const groups = groupByToMap(
        filters,
        (filter) =>
            (layer.fields ?? []).find(({ id }) => id === filter.id)?.detail
                ?.group ?? filter.id,
    );
    return `<div class="library-filters" aria-label="${escapeHtml(i18n.t("gateway.study.library_filters"))}">${Array.from(
        groups.entries(),
    )
        .map(([groupId, groupFilters]) => {
            const groupLabel = [
                ...new Set(groupFilters.map(({ label }) => label)),
            ].join(" / ");
            const exclusive = groupFilters.every(
                (filter) => filter.detail?.exclusive === true,
            );
            const required = groupFilters.every(
                (filter) => filter.detail?.required === true,
            );
            const defaultTag = groupFilters.find(
                (filter) => filter.detail?.defaultTag,
            )?.detail?.defaultTag;
            const tags = groupFilters.flatMap((filter) =>
                filter.values.map((value) => ({ filter, value })),
            );
            const selectedTag =
                tags.find(({ value }) => value === defaultTag) ??
                (required || tags.length === 1 ? tags[0] : undefined);
            return `<fieldset class="library-filter-group" data-library-filter-group="${escapeHtml(groupId)}" data-library-filter-exclusive="${exclusive}" data-library-filter-required="${required}"><legend>${escapeHtml(groupLabel)}</legend><div class="library-filter-pills">${tags
                .map((tag) => {
                    const { filter, value } = tag;
                    const selected = selectedTag === tag;
                    return `<button class="library-filter-pill btn-neutral${selected ? " active" : ""}" type="button" data-library-filter="${escapeHtml(filter.id)}" data-library-filter-value="${escapeHtml(value)}" aria-pressed="${selected}" title="${escapeHtml(`${filter.label}: ${value}`)}">${escapeHtml(value)}</button>`;
                })
                .join("")}</div></fieldset>`;
        })
        .join("")}</div>`;
}

function variantPlacement(entry, schema) {
    const schemas = Array.isArray(schema) ? schema : [schema];
    for (const reference of entry.references ?? []) {
        const relationship = schemas
            .find((candidate) => candidate?.id === entry.schemaId)
            ?.layers.find((layer) => layer.id === entry.layer)
            ?.relationships?.find(
                (candidate) => candidate.id === reference.relation,
            );
        if (relationship?.variant === true) {
            return {
                parentId: reference.entryId,
                direction: relationship.variantDirection,
            };
        }
    }
    return null;
}

function assignVariantPlacements(entries, schema) {
    const placements = new Map();
    const occupiedByParent = new Map();
    const requests = entries.flatMap((entry) => {
        const placement = variantPlacement(entry, schema);
        return placement ? [{ entry, ...placement }] : [];
    });
    for (const request of requests.filter(({ direction }) => direction)) {
        const occupied = occupiedByParent.get(request.parentId) ?? new Set();
        occupied.add(request.direction);
        occupiedByParent.set(request.parentId, occupied);
        placements.set(request.entry.id, request);
    }
    for (const request of requests.filter(({ direction }) => !direction)) {
        const occupied = occupiedByParent.get(request.parentId) ?? new Set();
        const direction = ["left", "up", "right"].find(
            (candidate) => !occupied.has(candidate),
        );
        if (!direction) continue;
        occupied.add(direction);
        occupiedByParent.set(request.parentId, occupied);
        placements.set(request.entry.id, { ...request, direction });
    }
    return placements;
}

function canDeleteEntry(entry) {
    return (
        isAdminScope() ||
        entry.createdBy === localStorage.getItem("cognis_account")
    );
}

function renderSelection(entry, i18n) {
    if (!canDeleteEntry(entry)) return "";
    const label = i18n
        .t("gateway.study.library_select_entry")
        .replace("{{ entry }}", entry.label);
    return `<input class="library-entry-selection" type="checkbox" data-library-select-entry="${escapeHtml(entry.id)}" aria-label="${escapeHtml(label)}">`;
}

function cardDefinition(entry, layer, entries, schema) {
    if (!layer.displayDefinition) return null;
    const definitionLayers = new Set(
        (layer.relationships ?? [])
            .filter((relationship) => {
                const target = schema.layers.find(
                    ({ id }) => id === relationship.targetLayer,
                );
                return isMeaningLayer(target);
            })
            .map(({ targetLayer }) => targetLayer),
    );
    const referencedIds = new Set(
        (entry.references ?? []).map(({ entryId }) => entryId),
    );
    return entries.find(
        (candidate) =>
            referencedIds.has(candidate.id) &&
            definitionLayers.has(candidate.layer),
    );
}

function renderCardContents(entry, layer, entries, schema, i18n) {
    const pronunciation = pronunciationValues(entry)
        .map((value) => escapeHtml(value))
        .join(" · ");
    const heading = isWritingUnitLayer(layer)
        ? `<span class="library-entry-heading"><strong>${escapeHtml(entry.label)}</strong>${pronunciation ? `<span class="library-card-pronunciation">${pronunciation}</span>` : ""}</span>`
        : `<strong>${escapeHtml(entry.label)}</strong>${pronunciation ? `<span class="library-card-pronunciation library-card-pronunciation-below">${pronunciation}</span>` : ""}`;
    const definition = cardDefinition(entry, layer, entries, schema);
    const definitionLabel = definition
        ? definitionText(
              definition,
              layerForEntry([schema], definition),
              schema.language,
          )
        : "";
    const definitionLink = definition
        ? `<span class="library-card-definition-link" role="link" tabindex="0" data-library-linked-entry="${escapeHtml(definition.id)}" data-library-preview="${escapeHtml(definitionLabel)}">${escapeHtml(definitionLabel)}</span>`
        : "";
    return `${heading}${definitionLink}<span class="library-entry-indicators">${renderMetadataPills(entry, layer)}${renderScope(entry, i18n)}</span>`;
}

function renderEntryCard(entry, layer, entries, schema, placements, i18n) {
    const filterValues = Object.fromEntries(
        metadataFields(layer).map((field) => [
            field.id,
            metadataValues(entry, layer)
                .filter((item) => item.field.id === field.id)
                .map(({ value }) => value),
        ]),
    );
    const variants = entries.flatMap((candidate) => {
        const placement = placements.get(candidate.id);
        return placement?.parentId === entry.id
            ? [{ entry: candidate, direction: placement.direction }]
            : [];
    });
    const variantHint = variants.length
        ? `<span class="library-entry-variant-hint" role="tooltip">${escapeHtml(i18n.t("gateway.study.library_variant_hint"))}</span>`
        : "";
    return `<div class="library-entry-card-shell"><button class="library-entry-card btn-neutral" type="button" ${entryAttributes(entry)} ${entrySearchAttribute(entry)} data-library-filter-values="${escapeHtml(JSON.stringify(filterValues))}">${renderCardContents(entry, layer, entries, schema, i18n)}</button>${renderSelection(entry, i18n)}${variantHint}${variants
        .map(
            ({ entry: variant, direction }) =>
                `<div class="library-entry-variant-shell library-entry-variant-${direction}"><button class="library-entry-card library-entry-variant btn-neutral" type="button" ${entryAttributes(variant)} ${entrySearchAttribute(variant)}>${renderCardContents(variant, layer, entries, schema, i18n)}</button>${renderSelection(variant, i18n)}</div>`,
        )
        .join("")}</div>`;
}

function renderLayerCards(layer, entries, schema, i18n) {
    const placements = assignVariantPlacements(entries, schema);
    const baseEntries = entries.filter((entry) => !placements.has(entry.id));
    if (!baseEntries.length) return "";
    if (!layer.grid) {
        return baseEntries
            .map((entry) =>
                renderEntryCard(
                    entry,
                    layer,
                    entries,
                    schema,
                    placements,
                    i18n,
                ),
            )
            .join("");
    }

    const entriesByGridId = new Map(
        baseEntries.flatMap((entry) => [
            [entry.sourceRecordId, entry],
            [entry.displayId, entry],
        ]),
    );
    const positionedIds = new Set(
        layer.grid.items.filter(
            (itemId) => itemId !== null && typeof itemId !== "object",
        ),
    );
    const positionedCards = layer.grid.items
        .map((itemId) => {
            if (itemId === null || typeof itemId === "object") {
                return '<div class="library-entry-card-blank" aria-hidden="true"></div>';
            }
            const entry = entriesByGridId.get(itemId);
            return entry
                ? renderEntryCard(
                      entry,
                      layer,
                      entries,
                      schema,
                      placements,
                      i18n,
                  )
                : "";
        })
        .join("");
    const additionalCards = baseEntries
        .filter(
            (entry) =>
                !positionedIds.has(entry.sourceRecordId) &&
                !positionedIds.has(entry.displayId),
        )
        .map((entry) =>
            renderEntryCard(entry, layer, entries, schema, placements, i18n),
        )
        .join("");
    return positionedCards + additionalCards;
}

function selectedEntryIds(root) {
    return Array.from(
        root.querySelectorAll("[data-library-select-entry]:checked"),
        (control) => control.dataset.librarySelectEntry,
    );
}

function selectionForCard(root, card) {
    return Array.from(
        root.querySelectorAll("[data-library-select-entry]"),
    ).find(
        (control) =>
            control.dataset.librarySelectEntry === card.dataset.libraryEntry,
    );
}

function updateDeleteSelectionButton(root, i18n) {
    const button = root.querySelector("[data-library-delete-selection]");
    if (!button) return;
    const count = selectedEntryIds(root).length;
    button.disabled = count === 0;
    button.textContent = i18n.t("ui.reuse.delete");
}

function setSelectionMode(root, enabled, i18n) {
    root.classList.toggle("library-selection-mode", enabled);
    if (!enabled) {
        root.querySelectorAll("[data-library-select-entry]").forEach(
            (selection) => {
                selection.checked = false;
            },
        );
    }
    const floatingActions = root.querySelector(
        '[data-floating-slot="library-selection-actions"]',
    );
    if (floatingActions) floatingActions.hidden = !enabled;
    updateDeleteSelectionButton(root, i18n);
}

function selectAllVisibleEntries(root, i18n) {
    root.querySelectorAll(
        "[data-library-panel]:not([hidden]) .library-entry-card-shell:not([hidden]) [data-library-select-entry]",
    ).forEach((selection) => {
        selection.checked = true;
    });
    updateDeleteSelectionButton(root, i18n);
}

async function confirmEntryDeletion(root, i18n) {
    const entryIds = selectedEntryIds(root);
    if (entryIds.length === 0) return null;
    let blacklistContentHashes = false;
    const action = await openPopup({
        title: i18n.t("gateway.study.library_delete_title"),
        body: `<p>${escapeHtml(i18n.t("gateway.study.library_delete_warning"))}</p><label class="library-delete-permanent"><input type="checkbox" data-library-blacklist-content> ${escapeHtml(i18n.t("gateway.study.library_delete_permanent"))}</label>`,
        variant: "warning",
        actions: [
            {
                id: "delete",
                label: i18n.t("ui.reuse.delete"),
                variant: "cancel",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "neutral",
            },
        ],
        onAction(selectedAction, overlay) {
            if (selectedAction !== "delete") return;
            blacklistContentHashes = overlay.querySelector(
                "[data-library-blacklist-content]",
            ).checked;
        },
    });
    return action === "delete" ? { entryIds, blacklistContentHashes } : null;
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
                    !isMeaningLayer(layer) && layer.semanticRole !== "particle",
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
                    const cards = renderLayerCards(
                        layer,
                        layerEntries,
                        schema,
                        i18n,
                    );
                    const contents = cards
                        ? cards
                        : `<p class="library-layer-empty">${escapeHtml(i18n.t("gateway.study.library_layer_empty"))}</p>`;
                    const rowSize = layer.grid?.rowSize;
                    return `<section class="library-layer-panel" role="tabpanel" id="library-panel-${schemaIndex}-${layerIndex}" aria-labelledby="library-tab-${schemaIndex}-${layerIndex}" data-library-panel="${escapeHtml(layer.id)}"${layerIndex === 0 ? "" : " hidden"}>${renderLayerFilters(layer, layerEntries, i18n, schema.language)}<div class="library-entry-grid"${rowSize ? ` style="--library-grid-row-size: ${rowSize}"` : ""}>${contents}</div><p class="library-filter-empty" hidden>${escapeHtml(i18n.t("gateway.study.library_filter_empty"))}</p></section>`;
                })
                .join("");
            return `<section class="library-schema" data-library-schema-id="${escapeHtml(schema.id)}"><h2>${escapeHtml(schemaLabel)}</h2><div class="library-layer-tabs" role="tablist" aria-label="${escapeHtml(i18n.t("gateway.study.library_layers"))}">${tabs}</div>${panels}</section>`;
        })
        .join("");
}

function activateLibraryLayer(schema, layerId) {
    schema.querySelectorAll("[data-library-tab]").forEach((item) => {
        const active = item.dataset.libraryTab === layerId;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
    });
    schema.querySelectorAll("[data-library-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.libraryPanel !== layerId;
    });
}

function focusLibraryEntry(root, entry, schemas) {
    const layer = layerForEntry(schemas, entry);
    const schema = root.querySelector(
        `[data-library-schema-id="${CSS.escape(entry.schemaId)}"]`,
    );
    const tab = schema?.querySelector(
        `[data-library-tab="${CSS.escape(entry.layer)}"]`,
    );
    if (!schema || !tab || isMeaningLayer(layer)) return false;
    activateLibraryLayer(schema, entry.layer);
    const target = root.querySelector(
        `.library-browser [data-library-entry="${CSS.escape(entry.id)}"]`,
    );
    const variantShell = target?.closest(".library-entry-variant-shell");
    variantShell?.classList.add("library-entry-variant-revealed");
    target?.focus();
    window.requestAnimationFrame(() => {
        highlightSearchTarget({ id: `library-entry-${entry.id}` });
    });
    if (variantShell) {
        window.setTimeout(() => {
            variantShell.classList.remove("library-entry-variant-revealed");
        }, 2000);
    }
    return true;
}

async function openEntryPopup(
    root,
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
        const audioObjectUrls = new Set();
        const audioController = new AbortController();
        const abortPopup = () => dismissPopup?.();
        signal?.addEventListener("abort", abortPopup, { once: true });
        const result = await openPopup({
            title: detail.entry.label,
            titleDetail: detailTitlePronunciation(
                detail.entry,
                layerForEntry(schemas, detail.entry),
            ),
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
                void loadLibraryAudio(
                    overlay,
                    audioObjectUrls,
                    audioController.signal,
                    i18n.t("gateway.study.library_audio_load_error"),
                );
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
        audioController.abort();
        for (const objectUrl of audioObjectUrls) {
            URL.revokeObjectURL(objectUrl);
        }
        signal?.removeEventListener("abort", abortPopup);
        if (result === "previous") selectedEntry = active[index - 1];
        else if (result === "next") selectedEntry = active[index + 1];
        else if (relatedEntry && focusLibraryEntry(root, relatedEntry, schemas))
            selectedEntry = null;
        else if (relatedEntry) selectedEntry = relatedEntry;
        else selectedEntry = null;
    }
}

function applyLibraryFilters(filter) {
    const group = filter.closest("[data-library-filter-group]");
    const willActivate = !filter.classList.contains("active");
    if (
        !willActivate &&
        group?.dataset.libraryFilterRequired === "true" &&
        group.querySelectorAll("button[data-library-filter].active").length ===
            1
    ) {
        return;
    }
    if (willActivate && group?.dataset.libraryFilterExclusive === "true") {
        group
            .querySelectorAll("button[data-library-filter].active")
            .forEach((activeFilter) => {
                activeFilter.classList.remove("active");
                activeFilter.setAttribute("aria-pressed", "false");
            });
    }
    filter.classList.toggle("active", willActivate);
    filter.setAttribute("aria-pressed", String(willActivate));
    const panel = filter.closest("[data-library-panel]");
    refreshLibraryFilterResults(panel);
}

function refreshLibraryFilterResults(panel) {
    if (!panel) return;
    const selectedFilters = Array.from(
        panel.querySelectorAll("button[data-library-filter].active"),
    );
    const selections = groupByToMap(
        selectedFilters,
        (item) => item.dataset.libraryFilter,
    );
    let visibleCount = 0;
    panel
        .querySelectorAll(".library-entry-card[data-library-filter-values]")
        .forEach((card) => {
            const values = JSON.parse(card.dataset.libraryFilterValues);
            const visible = Array.from(selections.entries()).every(
                ([fieldId, controls]) =>
                    controls.some((control) =>
                        values[fieldId]?.includes(
                            control.dataset.libraryFilterValue,
                        ),
                    ),
            );
            card.hidden = !visible;
            card.closest(".library-entry-card-shell").hidden = !visible;
            if (visible) visibleCount += 1;
        });
    panel.querySelector(".library-filter-empty").hidden = visibleCount > 0;
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
        const accountId = localStorage.getItem("cognis_account");
        const locations = [
            { scope: "global" },
            ...(accountId ? [{ scope: "user", scopeId: accountId }] : []),
        ];
        entries = (
            await Promise.all(
                schemas.flatMap((schema) =>
                    locations.map((location) =>
                        fetchLibraryEntries({
                            ...location,
                            schemaId: schema.id,
                        }),
                    ),
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
        floatingMenu: entries.some(canDeleteEntry)
            ? [
                  {
                      id: "library-selection-actions",
                      label: i18n.t("ui.reuse.actions"),
                      render: () =>
                          `<button class="btn-neutral" type="button" data-library-select-all>${escapeHtml(i18n.t("ui.reuse.select_all"))}</button><button class="btn-cancel" type="button" data-library-delete-selection disabled>${escapeHtml(i18n.t("ui.reuse.delete"))}</button><button class="btn-neutral library-selection-close" type="button" data-library-selection-close aria-label="${escapeHtml(i18n.t("ui.reuse.close"))}">X</button>`,
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
    root.querySelectorAll("[data-library-panel]").forEach((panel) => {
        if (panel.querySelector("button[data-library-filter].active")) {
            refreshLibraryFilterResults(panel);
        }
    });
    bindStudySubNavigation(root, { signal });
    let longPressTimer = null;
    let longPressOrigin = null;
    let suppressEntryClick = false;
    const cancelLongPress = () => {
        if (longPressTimer !== null) window.clearTimeout(longPressTimer);
        longPressTimer = null;
        longPressOrigin = null;
    };
    root.addEventListener(
        "pointerdown",
        (event) => {
            if (event.button !== 0) return;
            const card = event.target.closest("button[data-library-entry]");
            if (!card) return;
            const shell = card.closest(".library-entry-card-shell");
            if (
                card.classList.contains("library-entry-variant") ||
                !shell?.querySelector(".library-entry-variant-shell")
            )
                return;
            cancelLongPress();
            longPressOrigin = { x: event.clientX, y: event.clientY };
            longPressTimer = window.setTimeout(() => {
                shell.classList.add("library-entry-variants-open");
                card.focus();
                suppressEntryClick = true;
                longPressTimer = null;
            }, LONG_PRESS_DURATION_MS);
        },
        { signal },
    );
    root.addEventListener(
        "pointermove",
        (event) => {
            if (!longPressOrigin) return;
            const distance = Math.hypot(
                event.clientX - longPressOrigin.x,
                event.clientY - longPressOrigin.y,
            );
            if (distance > LONG_PRESS_MOVE_TOLERANCE_PX) cancelLongPress();
        },
        { signal },
    );
    root.addEventListener("pointerup", cancelLongPress, { signal });
    root.addEventListener("pointercancel", cancelLongPress, { signal });
    root.addEventListener(
        "contextmenu",
        (event) => {
            const card = event.target.closest("button[data-library-entry]");
            if (!card) return;
            const selection = selectionForCard(root, card);
            if (!selection) return;
            event.preventDefault();
            setSelectionMode(root, true, i18n);
            selection.checked = true;
            updateDeleteSelectionButton(root, i18n);
        },
        { signal },
    );
    root.addEventListener(
        "focusout",
        (event) => {
            const shell = event.target.closest(".library-entry-card-shell");
            if (!shell?.classList.contains("library-entry-variants-open"))
                return;
            if (!shell.contains(event.relatedTarget)) {
                shell.classList.remove("library-entry-variants-open");
            }
        },
        { signal },
    );
    root.addEventListener(
        "change",
        (event) => {
            if (!event.target.matches("[data-library-select-entry]")) return;
            if (
                root.classList.contains("library-selection-mode") &&
                selectedEntryIds(root).length === 0
            ) {
                setSelectionMode(root, false, i18n);
                return;
            }
            updateDeleteSelectionButton(root, i18n);
        },
        { signal },
    );
    root.addEventListener(
        "click",
        (event) => {
            const linkedPreview = event.target.closest(
                "[data-library-linked-entry]",
            );
            if (linkedPreview) {
                event.preventDefault();
                event.stopPropagation();
                const linkedEntry = entries.find(
                    ({ id }) => id === linkedPreview.dataset.libraryLinkedEntry,
                );
                if (linkedEntry) {
                    void openEntryPopup(
                        root,
                        linkedEntry,
                        schemas,
                        entries,
                        i18n,
                        languageCode,
                        signal,
                    );
                }
                return;
            }
            if (event.target.closest("[data-library-select-all]")) {
                selectAllVisibleEntries(root, i18n);
                return;
            }
            if (event.target.closest("[data-library-selection-close]")) {
                setSelectionMode(root, false, i18n);
                return;
            }
            const deleteSelection = event.target.closest(
                "[data-library-delete-selection]",
            );
            if (deleteSelection) {
                void confirmEntryDeletion(root, i18n).then(async (request) => {
                    if (!request) return;
                    try {
                        await deleteLibraryEntries(request.entryIds, {
                            blacklistContentHashes:
                                request.blacklistContentHashes,
                        });
                        entries = entries.filter(
                            (entry) => !request.entryIds.includes(entry.id),
                        );
                        root.querySelector(".library-browser").innerHTML =
                            renderBrowser(schemas, entries, i18n);
                        setSelectionMode(root, false, i18n);
                        showToast(
                            i18n.t("gateway.study.library_delete_success"),
                            { variant: "success" },
                        );
                    } catch {
                        showToast(
                            i18n.t("gateway.study.library_delete_error"),
                            { variant: "error" },
                        );
                    }
                });
                return;
            }
            if (event.target.matches("[data-library-select-entry]")) return;
            const filter = event.target.closest("button[data-library-filter]");
            if (filter) {
                applyLibraryFilters(filter);
                return;
            }
            const tab = event.target.closest("button[data-library-tab]");
            if (tab) {
                const schema = tab.closest(".library-schema");
                activateLibraryLayer(schema, tab.dataset.libraryTab);
                return;
            }
            const control = event.target.closest("button[data-library-entry]");
            if (!control) return;
            if (suppressEntryClick) {
                suppressEntryClick = false;
                return;
            }
            if (root.classList.contains("library-selection-mode")) {
                setSelectionMode(root, false, i18n);
            }
            const entry = entries.find(
                (candidate) => candidate.id === control.dataset.libraryEntry,
            );
            if (!entry) return;
            void openEntryPopup(
                root,
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
