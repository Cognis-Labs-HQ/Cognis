import { PAGE_WIDGET_LIBRARY } from "../config/pages.js";

const map = new Map(PAGE_WIDGET_LIBRARY.map((widget) => [widget.id, widget]));

export function getWidgetDefinition(widgetId) {
    return map.get(widgetId);
}

export function mergeWidgetConfig(widgetId, overrides = {}) {
    const definition = getWidgetDefinition(widgetId);
    return { ...(definition?.defaultConfig ?? {}), ...overrides };
}

export function getWidgetLibrary() {
    return [...map.values()];
}
