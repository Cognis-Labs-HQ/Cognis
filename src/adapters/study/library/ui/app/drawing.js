import { pronunciationValues } from "./reuse/readings.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { createAnchoredPopup } from "/static/reuse/popup.js";

import { drawingPattern } from "/static/gateways/study/reuse/drawing-pattern.js";

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

export async function loadDrawing(
    entry,
    layer,
    entries,
    schemas,
    definition = "",
) {
    const strokePattern = drawingPattern(entry, layer, entries, schemas);
    if (!strokePattern) return false;
    return (
        (await uiCtx.capabilities.get("study:drawing:load")?.({
            card: entry,
            definition,
            pronunciations: pronunciationValues(entry),
            strokePattern,
        })) === true
    );
}

export function placeAudioSpeaker(overlay, signal, popupApi) {
    const speaker = overlay.querySelector(
        ".library-detail-summary > :is(.library-audio-sequence, .library-audio-speaker, .library-audio-unavailable)",
    );
    if (!speaker) return;
    popupApi.appendHeadingAccessory(speaker);
    const source = speaker.querySelector(".library-audio-unavailable-tooltip");
    if (!source) return;
    const tooltip = createAnchoredPopup({
        className: "library-audio-unavailable-tooltip is-portal",
    });
    const show = () => tooltip.show(speaker, source.innerHTML);
    speaker.addEventListener("pointerenter", show);
    speaker.addEventListener("pointerleave", tooltip.hide);
    speaker.addEventListener("focusin", show);
    speaker.addEventListener("focusout", tooltip.hide);
    signal?.addEventListener("abort", () => tooltip.destroy(), { once: true });
}

export function bindDrawingPreview(popupApi, entry, signal) {
    return uiCtx.capabilities.get("study:drawing:observe")?.(
        (card) => {
            popupApi.setContentConcealed(
                card?.id === entry.id && card?.label === entry.label,
            );
        },
        { signal },
    );
}
