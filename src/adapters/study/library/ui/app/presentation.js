import { escapeHtml } from "/static/reuse/escape-html.js";
import { groupByToMap } from "/static/reuse/group-by.js";
import { fetchLibraryAudioUrl } from "/static/gateways/study/ui/library-client.js";

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

export function layerForEntry(schemas, entry) {
    return schemas
        .find((schema) => schema.id === entry.schemaId)
        ?.layers.find((layer) => layer.id === entry.layer);
}

export function definitionText(entry, layer, languageCode) {
    const translationsField = layer?.definitionLocalization?.translationsField;
    const translations = entry.fields?.[translationsField];
    if (!translations || typeof translations !== "object") return "";
    return (
        translations[parseLanguageCode(document.documentElement.lang)] ??
        translations[
            parseLanguageCode(document.documentElement.lang)?.split("-")[0]
        ] ??
        ""
    );
}

export function metadataFields(layer) {
    return (layer?.fields ?? []).filter(
        (field) => field.detail?.renderer === "badge" && !field.detail.hidden,
    );
}

export function metadataValues(entry, layer) {
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

export function relationSection(title, entries, emptyLabel) {
    return `<section class="library-detail-section"><h3>${escapeHtml(title)}</h3>${entries.length ? `<div class="library-related-entries">${entries.map((entry) => renderEntryLink(entry, "library-related-entry btn-neutral")).join("")}</div>` : `<p>${escapeHtml(emptyLabel)}</p>`}</section>`;
}

export function renderEntryLink(entry, className, label = entry.label) {
    return `<button class="${className}" type="button" ${entryAttributes(entry)} data-library-preview="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
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
    if (targetLayer?.id === sourceLayer?.id) return "alternateSpelling";
    return "composition";
}

export function compositionReferenceGroups(detail, schemas) {
    const sourceLayer = layerForEntry(schemas, detail.entry);
    const entriesById = new Map(
        (detail.references ?? []).map((entry) => [entry.id, entry]),
    );
    return (sourceLayer?.relationships ?? [])
        .filter((relationship) => relationship.resolverRole)
        .map((relationship) => ({
            id: relationship.id,
            presentationRole: relationshipPresentationRole(
                relationship,
                sourceLayer,
                schemas,
            ),
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

export function headingCompositionReference(detail, schemas) {
    return compositionReferenceGroups(detail, schemas).find(
        (group) =>
            group.presentationRole === "composition" &&
            group.entries.length === 1 &&
            group.entries[0].label === detail.entry.label,
    )?.entries[0];
}

export function renderCompositionGroups(groups, i18n) {
    return groups
        .map(
            (group) =>
                `<section class="library-composition" data-library-composition="${escapeHtml(group.id)}" data-library-presentation-role="${escapeHtml(group.presentationRole)}"><span class="library-composition-label">${escapeHtml(i18n.t(`gateway.study.library_relationship_${group.presentationRole}`))}</span><div class="library-component-boxes">${group.entries
                    .map(
                        (entry, index) =>
                            `${index ? `<span class="library-composition-operator" aria-hidden="true">${group.presentationRole === "composition" ? "+" : "·"}</span>` : ""}${renderEntryLink(entry, "library-component-box btn-neutral")}`,
                    )
                    .join("")}</div></section>`,
        )
        .join("");
}

export function renderPronunciation(entry, layer) {
    const values = pronunciationValues(entry);
    if (!values.length || isWritingUnitLayer(layer)) return "";
    return `<p class="library-pronunciation">${values.map((value) => escapeHtml(value)).join(" · ")}</p>`;
}

export function detailTitlePronunciation(entry, layer) {
    const pronunciations = pronunciationValues(entry);
    return layer?.semanticRole === "atomicWritingUnit" && pronunciations.length
        ? pronunciations.join(" · ")
        : "";
}

export function renderAudio(entry, layer) {
    const audioField = (layer?.fields ?? []).find(
        (field) => field.id === "audio" && field.type === "audio",
    );
    const value = audioField ? entry.fields?.[audioField.id] : undefined;
    if (typeof value !== "string" || !value) return "";
    const label =
        localizedLabel(audioField.metadata, entry.language) || audioField.id;
    return `<div class="library-audio" data-library-audio-player><audio preload="none" data-library-audio-entry="${escapeHtml(entry.id)}" data-library-audio-field="${escapeHtml(audioField.id)}" aria-label="${escapeHtml(label)}"></audio><button class="library-audio-toggle btn-neutral" type="button" data-library-audio-toggle aria-label="${escapeHtml(label)}">▶</button><span class="library-audio-time" data-library-audio-time>0:00</span><input class="library-audio-progress" type="range" min="0" max="1000" value="0" step="1" data-library-audio-progress aria-label="${escapeHtml(label)}"></div>`;
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
}
