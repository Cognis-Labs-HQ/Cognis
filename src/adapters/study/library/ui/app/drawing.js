import { uiCtx } from "/static/reuse/ui-ctx.js";

export function drawingPattern(entry, layer) {
    return (layer?.fields ?? [])
        .filter(({ type }) => type === "strokePattern")
        .map(({ id }) => entry.fields?.[id])
        .find(Boolean);
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

export function placeAudioSpeaker(overlay) {
    const speaker = overlay.querySelector(
        ".library-detail-summary > :is(.library-audio-sequence, .library-audio-speaker)",
    );
    if (speaker) overlay.querySelector(".popup-heading")?.append(speaker);
}
