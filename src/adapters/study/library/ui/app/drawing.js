import { uiCtx } from "/static/reuse/ui-ctx.js";
import { pronunciationValues } from "./presentation.js";

function ownDrawingPattern(entry, layer) {
    return (layer?.fields ?? [])
        .filter(({ type }) => type === "strokePattern")
        .map(({ id }) => entry.fields?.[id])
        .find(Boolean);
}

function orderedDrawingPieces(entry, entries, schemas) {
    const drawable = entries
        .map((candidate) => {
            const schema = schemas.find(({ id }) => id === candidate.schemaId);
            const layer = schema?.layers.find(
                ({ id }) => id === candidate.layer,
            );
            const pattern = ownDrawingPattern(candidate, layer);
            return pattern &&
                ["atomicWritingUnit", "compoundWritingUnit"].includes(
                    layer?.semanticRole,
                )
                ? { entry: candidate, pattern }
                : null;
        })
        .filter(Boolean)
        .sort(
            (left, right) => right.entry.label.length - left.entry.label.length,
        );
    const written = [];
    let offset = 0;
    while (offset < entry.label.length) {
        const candidate = drawable.find(
            ({ entry: item }) =>
                item.label && entry.label.startsWith(item.label, offset),
        );
        if (!candidate) break;
        written.push(candidate);
        offset += candidate.entry.label.length;
    }
    if (written.length && offset === entry.label.length) return written;
    return [];
}

export function drawingPattern(entry, layer, entries = [], schemas = []) {
    if (
        layer?.semanticRole === "orderedLexicalSequence" ||
        ["composite", "sentence"].includes(entry.class)
    )
        return undefined;
    const own = ownDrawingPattern(entry, layer);
    if (
        own &&
        ["atomicWritingUnit", "compoundWritingUnit"].includes(
            layer?.semanticRole,
        )
    )
        return { ...own, groups: [own.strokes.length] };
    const pieces = orderedDrawingPieces(entry, entries, schemas);
    if (!pieces.length) return undefined;
    const columns = pieces.length;
    const inset = 0.025;
    return {
        coordinateSystem: "normalized",
        tolerance: Math.min(
            ...pieces.map(({ pattern }) => pattern.tolerance ?? 55),
        ),
        strokes: pieces.flatMap(({ pattern }, column) =>
            pattern.strokes.map((stroke) => ({
                ...stroke,
                points: stroke.points.map((point) => ({
                    ...point,
                    x: (column + inset + point.x * (1 - inset * 2)) / columns,
                })),
            })),
        ),
        groups: pieces.map(({ pattern }) => pattern.strokes.length),
        columns,
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
        pronunciations: pronunciationValues(entry),
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
            pronunciations: pronunciationValues(entry),
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
