import { pickInitialsColor } from "/static/reuse/avatar-utils.js";

export function getPointerOffset(canvasInstance) {
    return canvasInstance?.getViewportOffset?.() ?? { x: 0, y: 0 };
}

export function getPresenceDisplayName(entry) {
    return entry?.displayName || entry?.handle || "Guest";
}

export function getPresenceColor(entry) {
    return entry?.color || pickInitialsColor(getPresenceDisplayName(entry));
}

export function getSelectionPayload(canvasInstance) {
    return { elementIds: canvasInstance?.getSelectedElementIds?.() ?? [] };
}

export function applyRemotePresenceSelections({
    canvasInstance,
    entries = [],
    sessionId = "",
}) {
    const selections = entries
        .filter((entry) => String(entry?.sessionId ?? "") !== sessionId)
        .filter((entry) => entry?.active !== false)
        .map((entry) => ({
            color: getPresenceColor(entry),
            elementIds: entry.selection?.elementIds ?? [],
            label: getPresenceDisplayName(entry),
        }))
        .filter((selection) => selection.elementIds.length > 0);
    canvasInstance?.setRemoteSelections?.(selections);
}
