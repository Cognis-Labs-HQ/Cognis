import { escapeHtml } from "/static/reuse/escape-html.js";
import { groupByToMap } from "/static/reuse/group-by.js";
import { fetchLibraryAudioUrl } from "/static/gateways/study/ui/library-client.js";
import { parseLanguageCode } from "/static/gateways/study/ui/language.js";

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

export function metadataFields(layer) {
    return (layer?.fields ?? []).filter(
        (field) => field.detail?.renderer === "badge" && !field.detail.hidden,
    );
}

export function filterFields(layer) {
    return (layer?.fields ?? []).filter(
        (field) =>
            !field.detail?.hidden &&
            (field.detail?.renderer === "badge" ||
                field.detail?.filterable === true),
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
        .map(
            ({ value }) =>
                `<span class="library-metadata-pill">${escapeHtml(value)}</span>`,
        )
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

export function renderScope(entry, i18n) {
    const icon =
        entry.scope === "global"
            ? "globe"
            : entry.scope === "class"
              ? "class"
              : "user";
    const label = scopeLabel(entry, i18n);
    return `<span class="library-scope" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"><picture><source media="(prefers-color-scheme: dark)" srcset="/static/adapters/study/library/assets/scope-${icon}-dark.svg"><img src="/static/adapters/study/library/assets/scope-${icon}-light.svg" alt=""></picture></span>`;
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

export function pronunciationValues(entry) {
    const pronunciation = entry.fields?.pronunciation;
    if (!pronunciation) return [];
    return (Array.isArray(pronunciation) ? pronunciation : [pronunciation]).map(
        (value) => String(value),
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
        group.references.push({ entry, position: reference.position ?? 0 });
        groupsByRole.set(presentationRole, group);
    }
    return Array.from(groupsByRole.values(), (group) => ({
        id: group.id,
        presentationRole: group.presentationRole,
        entries: group.references
            .sort((left, right) => left.position - right.position)
            .map(({ entry }) => entry),
    }));
}

export function headingCompositionReferences(detail, schemas) {
    return (
        compositionReferenceGroups(detail, schemas).find(
            (group) =>
                group.presentationRole === "composition" &&
                group.entries.length > 0 &&
                group.entries.map(({ label }) => label).join("") ===
                    detail.entry.label,
        )?.entries ?? []
    );
}

function entryAudio(entry, layer) {
    const audioField = (layer?.fields ?? []).find(
        (field) => field.id === "audio" && field.type === "audio",
    );
    const value = audioField ? entry.fields?.[audioField.id] : undefined;
    return {
        audioField,
        valid: typeof value === "string" && value.startsWith("file:"),
    };
}

export function renderAudio(
    entry,
    layer,
    entries = [],
    schemas = [],
    fallbackLabel = "",
) {
    const own = entryAudio(entry, layer);
    const useRelatedProviderAudio =
        own.valid &&
        layer?.semanticRole === "compoundWritingUnit" &&
        entry.createdBy?.startsWith("content-pack:") &&
        (entry.references ?? []).length > 0;
    let sources =
        own.valid && !useRelatedProviderAudio
            ? [{ entry, field: own.audioField }]
            : [];
    let complete = sources.length > 0;
    if (!complete && (entry.references ?? []).length) {
        const resolveSources = (candidate, visited = new Set()) => {
            if (!candidate || visited.has(candidate.id)) return null;
            visited.add(candidate.id);
            const candidateLayer = layerForEntry(schemas, candidate);
            const audio = entryAudio(candidate, candidateLayer);
            if (audio.valid)
                return [{ entry: candidate, field: audio.audioField }];
            const content = (candidate.references ?? [])
                .sort(
                    (left, right) =>
                        (left.position ?? 0) - (right.position ?? 0),
                )
                .map(({ entryId }) => entries.find(({ id }) => id === entryId))
                .filter(Boolean)
                .filter(
                    (target) =>
                        !["definition", "meaning"].includes(
                            layerForEntry(schemas, target)?.semanticRole,
                        ),
                );
            if (!content.length) return null;
            const nested = content.map((target) =>
                resolveSources(target, new Set(visited)),
            );
            return nested.every(Boolean) ? nested.flat() : null;
        };
        const resolved = resolveSources(entry);
        sources = resolved ?? [];
        complete = Boolean(resolved?.length);
    }
    if (!complete && own.valid) {
        sources = [{ entry, field: own.audioField }];
        complete = true;
    }
    const label = own.audioField
        ? localizedLabel(own.audioField.metadata, entry.language) ||
          own.audioField.id
        : fallbackLabel;
    if (!complete || !sources.length)
        return `<button class="library-audio-speaker btn-neutral" type="button" disabled aria-label="${escapeHtml(label)}">${speakerPicture()}</button>`;
    return `<div class="library-audio-sequence" data-library-audio-sequence>${sources
        .map(
            ({ entry: source, field }) =>
                `<audio preload="none" data-library-audio-entry="${escapeHtml(source.id)}" data-library-audio-field="${escapeHtml(field.id)}"></audio>`,
        )
        .join(
            "",
        )}<button class="library-audio-speaker btn-neutral" type="button" data-library-audio-sequence-toggle aria-label="${escapeHtml(label)}">${speakerPicture()}</button></div>`;
}

function speakerPicture() {
    return '<svg class="library-speaker-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9h4l5-4v14l-5-4H5z"></path><path d="M17 9a4 4 0 0 1 0 6"></path><path d="M19.5 6.5a8 8 0 0 1 0 11"></path></svg>';
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
    overlay
        .querySelectorAll("[data-library-audio-sequence]")
        .forEach((group) => {
            const audio = Array.from(group.querySelectorAll("audio"));
            const toggle = group.querySelector(
                "[data-library-audio-sequence-toggle]",
            );
            if (!toggle || audio.some((item) => !item.src)) {
                if (toggle) toggle.disabled = true;
                return;
            }
            toggle.addEventListener("click", async () => {
                toggle.disabled = true;
                for (const item of audio) {
                    item.currentTime = 0;
                    await item.play();
                    await new Promise((resolve) =>
                        item.addEventListener("ended", resolve, { once: true }),
                    );
                }
                toggle.disabled = false;
            });
        });
}
