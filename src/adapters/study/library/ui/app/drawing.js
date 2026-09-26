import { uiCtx } from "/static/reuse/ui-ctx.js";

function ownDrawingPattern(entry, layer) {
    return (layer?.fields ?? [])
        .filter(({ type }) => type === "strokePattern")
        .map(({ id }) => entry.fields?.[id])
        .find(Boolean);
}

export function drawingPattern(entry, layer, entries = [], schemas = []) {
    const own = ownDrawingPattern(entry, layer);
    if (
        own &&
        ["atomicWritingUnit", "compoundWritingUnit"].includes(
            layer?.semanticRole,
        )
    )
        return { ...own, groups: [own.strokes.length] };
    const resolve = (candidate, visited = new Set()) => {
        if (!candidate || visited.has(candidate.id)) return [];
        visited.add(candidate.id);
        const candidateSchema = schemas.find(
            ({ id }) => id === candidate.schemaId,
        );
        const candidateLayer = candidateSchema?.layers.find(
            ({ id }) => id === candidate.layer,
        );
        const pattern = ownDrawingPattern(candidate, candidateLayer);
        if (
            pattern &&
            ["atomicWritingUnit", "compoundWritingUnit"].includes(
                candidateLayer?.semanticRole,
            )
        )
            return [pattern];
        return (candidate.references ?? [])
            .slice()
            .sort(
                (left, right) =>
                    (left.position ?? Number.MAX_SAFE_INTEGER) -
                    (right.position ?? Number.MAX_SAFE_INTEGER),
            )
            .flatMap(({ entryId }) =>
                resolve(
                    entries.find(({ id }) => id === entryId),
                    new Set(visited),
                ),
            );
    };
    const pieces = resolve(entry);
    if (!pieces.length) return undefined;
    return {
        coordinateSystem: "normalized",
        tolerance: Math.min(...pieces.map(({ tolerance = 55 }) => tolerance)),
        strokes: pieces.flatMap(({ strokes }) => strokes),
        groups: pieces.map(({ strokes }) => strokes.length),
    };
}

export function resolveDraw(entry, layer, context) {
    return drawingPattern(entry, layer, context.entries, context.schemas);
}

export function canDraw(pattern) {
    return (
        Boolean(pattern) &&
        Boolean(uiCtx.capabilities.get("study:drawing:open"))
    );
}

export function drawingHeaderActions(pattern, i18n) {
    return canDraw(pattern)
        ? [
              {
                  id: "draw",
                  label: i18n.t("gateway.study.library_practice_writing"),
                  icon: {
                      light: "/static/adapters/study/library/assets/draw-light.svg",
                      dark: "/static/adapters/study/library/assets/draw-dark.svg",
                  },
              },
          ]
        : [];
}

export function openDrawing(entry, strokePattern, definition = "") {
    return uiCtx.capabilities.get("study:drawing:open")({
        card: entry,
        definition,
        strokePattern,
    });
}

export function loadDrawing(entry, layer, entries, schemas, definition = "") {
    const strokePattern = drawingPattern(entry, layer, entries, schemas);
    if (!strokePattern) return false;
    return (
        uiCtx.capabilities.get("study:drawing:load")?.({
            card: entry,
            definition,
            strokePattern,
        }) === true
    );
}

export function placeAudioSpeaker(overlay) {
    const speaker = overlay.querySelector(
        ".library-detail-summary > :is(.library-audio-sequence, .library-audio-speaker)",
    );
    if (speaker) overlay.querySelector(".popup-heading")?.append(speaker);
}
