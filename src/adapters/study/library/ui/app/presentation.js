import { allEntryReferences } from "../reuse/entry-graph.js";
import { isOffline } from "/static/reuse/offline-state.js";
import { activateLibraryMediaSession } from "./audio-media-session.js";
import { showToast } from "/static/reuse/toast.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { groupByToMap } from "/static/reuse/group-by.js";
import { fetchLibraryAudioUrl } from "/static/gateways/study/library-client.js";
import { parseLanguageCode } from "/static/gateways/study/language.js";
import { referencedTransformation } from "../reuse/transformations.js";
import { resolveReferenceTitleComposition } from "./composition-links.js";

export function entryAttributes(entry) {
    return `data-library-schema="${escapeHtml(entry.schemaId)}" data-library-layer="${escapeHtml(entry.layer)}" data-library-entry="${escapeHtml(entry.id)}"`;
}

export function entrySearchAttribute(entry) {
    return `data-search-id="library-entry-${escapeHtml(entry.id)}"`;
}

export function localizedLabel(metadata, contentLanguage) {
    const labels = new Map(
        Object.entries(metadata?.labels ?? {}).map(([key, value]) => [
            parseLanguageCode(key),
            value,
        ]),
    );
    for (const language of [document.documentElement.lang]) {
        const code = parseLanguageCode(language);
        const label = labels.get(code) ?? labels.get(code?.split("-")[0]);
        if (label) return label;
    }
    return "";
}

export function localizedTextValue(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return "";
    const localized = new Map(
        Object.entries(value).map(([key, text]) => [
            parseLanguageCode(key),
            text,
        ]),
    );
    const language = parseLanguageCode(document.documentElement.lang);
    const text =
        localized.get(language) ?? localized.get(language?.split("-")[0]);
    return typeof text === "string" ? text : "";
}

export function renderValue(value) {
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

export function section(title, value) {
    if (
        value === undefined ||
        value === null ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === "object" && Object.keys(value).length === 0)
    )
        return "";
    return `<section class="library-detail-section"><h3>${escapeHtml(title)}</h3>${renderValue(value)}</section>`;
}

export function renderDetailFields(fields) {
    const items = Object.entries(fields ?? {});
    if (!items.length) return "";
    return `<div class="library-detail-facts">${items
        .map(
            ([label, value]) =>
                `<div class="library-detail-fact"><strong>${escapeHtml(label)}</strong><span>${renderValue(value)}</span></div>`,
        )
        .join("")}</div>`;
}

export function layerForEntry(schemas, entry) {
    return schemas
        .find((schema) => schema.id === entry.schemaId)
        ?.layers.find((layer) => layer.id === entry.layer);
}

export function definitionText(entry, layer, languageCode) {
    const translationsField = layer?.definitionLocalization?.translationsField;
    const translations = entry.fields?.[translationsField];
    if (!translations || typeof translations !== "object") return "";
    return localizedTextValue(translations);
}

export function visibleDetailFields(layer) {
    return (layer?.fields ?? []).filter(
        (field) => !field.hidden && !field.detail?.hidden,
    );
}

export function metadataFields(layer) {
    return visibleDetailFields(layer).filter(
        (field) => field.detail?.renderer === "badge",
    );
}

export function filterFields(layer) {
    return visibleDetailFields(layer).filter(
        (field) =>
            field.detail?.renderer === "badge" ||
            field.detail?.filterable === true,
    );
}

export function fieldValues(entry, fields) {
    return fields.flatMap((field) => {
        const raw = entry.fields?.[field.id];
        const values = Array.isArray(raw) ? raw : [raw];
        return values
            .map((value) =>
                value && typeof value === "object"
                    ? localizedTextValue(value)
                    : value,
            )
            .filter(
                (value) =>
                    value !== undefined && value !== null && value !== "",
            )
            .map((value) => ({ field, value: String(value) }));
    });
}

export function metadataValues(entry, layer) {
    return fieldValues(entry, metadataFields(layer));
}

export function renderMetadataPills(entry, layer) {
    const pills = metadataValues(entry, layer);
    if (!pills.length) return "";
    return `<div class="library-metadata-pills">${pills
        .map(({ field, value }) => {
            const option = field.input?.options?.find(
                (option) => option.value === value,
            );
            const label = option
                ? localizedLabel(option.metadata, entry.language)
                : value;
            return `<span class="library-metadata-pill">${escapeHtml(label)}</span>`;
        })
        .join("")}</div>`;
}

export function scopeLabel(entry, i18n) {
    if (entry.scope === "class") {
        const className = entry.fields?.className ?? entry.scopeId;
        return i18n
            .t("gateway.study.library_scope_class")
            .replace("{{ class name }}", String(className));
    }
    return i18n.t(`gateway.study.library_scope_${entry.scope}`);
}

export function renderScope(entry, i18n, label = scopeLabel(entry, i18n)) {
    const icon =
        entry.scope === "global"
            ? "globe"
            : entry.scope === "class"
              ? "class"
              : "user";
    return `<span class="library-scope" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"><span class="library-scope-icon library-scope-icon--${icon}" aria-hidden="true"></span></span>`;
}

export function relationSection(title, entries, emptyLabel, labelForEntry) {
    return `<section class="library-detail-section"><h3>${escapeHtml(title)}</h3>${entries.length ? `<div class="library-related-entries">${entries.map((entry) => renderEntryLink(entry, "library-related-entry btn-neutral", labelForEntry?.(entry) ?? entry.label)).join("")}</div>` : `<p>${escapeHtml(emptyLabel)}</p>`}</section>`;
}

export function renderEntryLink(entry, className, label = entry.label) {
    return `<button class="${className}" type="button" ${entryAttributes(entry)}>${escapeHtml(label)}</button>`;
}

export function isMeaningLayer(layer) {
    return (
        layer?.semanticRole === "definition" ||
        layer?.semanticRole === "meaning"
    );
}

export function isWritingUnitLayer(layer) {
    return (
        layer?.semanticRole === "atomicWritingUnit" ||
        layer?.semanticRole === "compoundWritingUnit"
    );
}

export function relationshipPresentationRole(
    relationship,
    sourceLayer,
    schemas,
) {
    if (relationship.presentationRole) return relationship.presentationRole;
    const targetLayer = schemas
        .flatMap(({ layers }) => layers)
        .find(({ id }) => id === relationship.targetLayer);
    if (targetLayer?.semanticRole === "lexicalUnit") return "pronunciation";
    if (targetLayer?.id === sourceLayer?.id && relationship.variant)
        return "alternateSpelling";
    return relationship.resolverRole ? "composition" : undefined;
}

export function compositionReferenceGroups(detail, schemas) {
    const sourceLayer = layerForEntry(schemas, detail.entry);
    const entriesById = new Map(
        (detail.references ?? []).map((entry) => [entry.id, entry]),
    );
    const relationshipsById = new Map(
        (sourceLayer?.relationships ?? [])
            .filter((relationship) => relationship.resolverRole)
            .map((relationship) => [relationship.id, relationship]),
    );
    const grouped = Object.entries(detail.entry.referenceGroups ?? {}).flatMap(
        ([relation, groups]) =>
            groups.map((references, groupIndex) => ({
                relation,
                groupIndex,
                references,
            })),
    );
    const groupedResults = grouped.flatMap(
        ({ relation, groupIndex, references }) => {
            const relationship = relationshipsById.get(relation);
            if (!relationship) return [];
            const entries = references
                .slice()
                .sort(
                    (left, right) =>
                        (left.position ?? 0) - (right.position ?? 0),
                )
                .map((reference) => {
                    const entry = entriesById.get(reference.entryId);
                    return entry
                        ? {
                              ...entry,
                              referenceTransformation: reference.transformation,
                          }
                        : null;
                })
                .filter(Boolean);
            return entries.length
                ? [
                      {
                          id: `${relation}:${groupIndex}`,
                          presentationRole: relationshipPresentationRole(
                              relationship,
                              sourceLayer,
                              schemas,
                          ),
                          entries,
                      },
                  ]
                : [];
        },
    );
    const groupsByRole = new Map();
    for (const reference of detail.entry.references ?? []) {
        const relationship = relationshipsById.get(reference.relation);
        const entry = entriesById.get(reference.entryId);
        if (
            !relationship ||
            !entry ||
            isMeaningLayer(layerForEntry(schemas, entry))
        )
            continue;
        const presentationRole = relationshipPresentationRole(
            relationship,
            sourceLayer,
            schemas,
        );
        const group = groupsByRole.get(presentationRole) ?? {
            id: relationship.id,
            presentationRole,
            references: [],
        };
        group.references.push({
            entry: {
                ...entry,
                referenceTransformation: reference.transformation,
            },
            position: reference.position ?? 0,
        });
        groupsByRole.set(presentationRole, group);
    }
    return [
        ...groupedResults,
        ...Array.from(groupsByRole.values(), (group) => ({
            id: group.id,
            presentationRole: group.presentationRole,
            entries: group.references
                .sort((left, right) => left.position - right.position)
                .map(({ entry }) => entry),
        })),
    ];
}

export function headingCompositionReferences(detail, schemas) {
    const schema = schemas.find(({ id }) => id === detail.entry.schemaId);
    const literals = (
        layerForEntry(schemas, detail.entry)?.cardConstructor
            ?.literal_carousels ?? []
    ).flatMap(({ values }) => values);
    for (const group of compositionReferenceGroups(detail, schemas)) {
        if (group.presentationRole !== "composition") continue;
        const references = group.entries.map((entry) => {
            const transformation = referencedTransformation(
                entry,
                schema,
                entry.referenceTransformation,
            );
            if (entry.referenceTransformation !== undefined && !transformation)
                throw new Error("invalid_reference_transformation");
            return transformation
                ? { ...entry, label: transformation.node.value }
                : entry;
        });
        const title = resolveReferenceTitleComposition(
            detail.entry.label,
            references,
            literals,
        );
        if (title.length) return title;
    }
    return [];
}

function entryAudio(entry, layer) {
    const audioField = (layer?.fields ?? []).find(
        (field) => field.id === "audio" && field.type === "audio",
    );
    const value = audioField ? entry.fields?.[audioField.id] : undefined;
    return {
        audioField,
        valid:
            (typeof value === "string" && value.startsWith("file:")) ||
            (entry.scope === "global" &&
                audioField?.audioLookupAvailable === true &&
                !entry.tags?.includes("punctuation") &&
                (!layer?.metadata?.audio?.requiresReading ||
                    entry.fields?.pronunciation?.length > 0)),
    };
}

export function renderAudio(
    entry,
    layer,
    entries = [],
    schemas = [],
    fallbackLabel = "",
    missingDependencyLabel = "",
    allowUpload = false,
) {
    if (isOffline()) return "";
    const own = entryAudio(entry, layer);
    const composite = own.audioField && allEntryReferences(entry).length > 0;
    const sources =
        own.valid || composite || (allowUpload && own.audioField)
            ? [{ entry, field: own.audioField }]
            : [];
    const complete = sources.length > 0;
    const label =
        (own.audioField &&
            localizedLabel(own.audioField.metadata, entry.language)) ||
        fallbackLabel;
    if (!label) throw new Error("audio_label_required");
    if (!complete || !sources.length) {
        const dependenciesMissingAudio =
            ["lexicalUnit", "orderedLexicalSequence"].includes(
                layer?.semanticRole,
            ) && allEntryReferences(entry).length > 0;
        const unavailableLabel = dependenciesMissingAudio
            ? missingDependencyLabel
            : "";
        const button = `<button class="library-audio-speaker btn-neutral" type="button" disabled aria-label="${escapeHtml(unavailableLabel || label)}">${speakerPicture()}</button>`;
        return unavailableLabel
            ? `<span class="library-audio-unavailable">${button}<span class="library-audio-unavailable-tooltip" role="tooltip">${escapeHtml(unavailableLabel)}</span></span>`
            : button;
    }
    return `<div class="library-audio-sequence" data-library-audio-sequence>${sources
        .map(
            ({ entry: source, field }) =>
                `<audio preload="none" data-library-audio-title="${escapeHtml(source.label)}" data-library-audio-album="${escapeHtml(localizedLabel(layer.metadata))}" data-library-audio-entry="${escapeHtml(source.id)}" data-library-audio-field="${escapeHtml(field.id)}"${source.referenceTransformation ? ` data-library-audio-transformation="${escapeHtml(JSON.stringify(source.referenceTransformation))}"` : ""}></audio>`,
        )
        .join(
            "",
        )}<button class="library-audio-speaker btn-neutral" type="button" data-library-audio-sequence-toggle${!own.valid && !composite ? " disabled" : ""} aria-label="${escapeHtml(label)}">${speakerPicture()}</button></div>`;
}

function speakerPicture() {
    return '<img class="library-speaker-icon library-speaker-icon-light" src="/static/adapters/study/library/assets/speaker-light.svg" alt="" aria-hidden="true"><img class="library-speaker-icon library-speaker-icon-dark" src="/static/adapters/study/library/assets/speaker-dark.svg" alt="" aria-hidden="true">';
}

export function formatAudioTime(value) {
    const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function connectLibraryAudioControls(audio) {
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
        if (isOffline()) return;
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

export async function loadLibraryAudio(
    overlay,
    objectUrls,
    signal,
    errorMessage,
) {
    if (isOffline()) return;

    async function prepare(audio) {
        if (isOffline()) return;
        if (audio.src) return;
        const objectUrl = await fetchLibraryAudioUrl(
            audio.dataset.libraryAudioEntry,
            audio.dataset.libraryAudioField,
            {
                signal,
                transformation: audio.dataset.libraryAudioTransformation
                    ? JSON.parse(audio.dataset.libraryAudioTransformation)
                    : undefined,
            },
        );
        if (isOffline() || !audio.isConnected || signal?.aborted || audio.src) {
            URL.revokeObjectURL(objectUrl);
            return;
        }
        objectUrls.add(objectUrl);
        audio.src = objectUrl;
        connectLibraryAudioControls(audio);
    }

    async function play(audio) {
        if (isOffline() || signal?.aborted || !audio.isConnected) return;
        await activateLibraryMediaSession(audio, signal);
        if (isOffline() || signal?.aborted || !audio.isConnected) return;
        await new Promise((resolve, reject) => {
            const finish = (error) => {
                audio.removeEventListener("ended", ended);
                audio.removeEventListener("error", failed);
                signal?.removeEventListener("abort", aborted);
                if (error) reject(error);
                else resolve();
            };
            const ended = () => finish();
            const failed = () => finish(new Error("audio_playback_failed"));
            const aborted = () => {
                audio.pause();
                finish();
            };
            audio.addEventListener("ended", ended, { once: true });
            audio.addEventListener("error", failed, { once: true });
            signal?.addEventListener("abort", aborted, { once: true });
            audio.currentTime = 0;
            audio.play().catch(finish);
        });
    }

    overlay
        .querySelectorAll("[data-library-audio-sequence]")
        .forEach((group) => {
            const audio = Array.from(group.querySelectorAll("audio"));
            const toggle = group.querySelector(
                "[data-library-audio-sequence-toggle]",
            );
            if (!toggle || !audio.length) return;
            toggle.addEventListener(
                "click",
                async () => {
                    if (toggle.disabled) return;
                    toggle.disabled = true;
                    try {
                        await Promise.all(audio.map(prepare));
                        for (const item of audio) await play(item);
                    } catch (error) {
                        if (signal?.aborted || error?.name === "AbortError")
                            return;
                        uiCtx.capabilities.get("ui:log")?.(
                            "error",
                            "Library audio playback failed.",
                            {
                                component: "study-library",
                                operation: "playAudio",
                                errorName:
                                    error instanceof Error
                                        ? error.name
                                        : "Error",
                            },
                        );
                        showToast(errorMessage, { variant: "error" });
                    } finally {
                        toggle.disabled = false;
                    }
                },
                { signal },
            );
        });
}
