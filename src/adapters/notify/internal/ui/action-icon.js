/**
 * Sanitizes component-supplied notification action icons before rendering them.
 * Public export: sanitizeNotificationActionIcon(iconSvg) returns allowlisted SVG markup or an empty string.
 * @example const iconMarkup = sanitizeNotificationActionIcon(action.iconSvg);
 */

/**
 * Removes unsupported SVG nodes and attributes while retaining the action icon geometry.
 * @param {unknown} iconSvg Provider-supplied SVG markup.
 * @returns {string} Sanitized SVG markup, or an empty string for a missing or invalid SVG root.
 */
export function sanitizeNotificationActionIcon(iconSvg) {
    if (typeof iconSvg !== "string") return "";
    const documentNode = new DOMParser().parseFromString(
        iconSvg,
        "image/svg+xml",
    );
    const svg = documentNode.documentElement;
    if (
        svg.nodeName.toLowerCase() !== "svg" ||
        svg.querySelector("parsererror")
    )
        return "";
    const allowedElements = new Set([
        "svg",
        "path",
        "circle",
        "line",
        "polyline",
    ]);
    const allowedAttributes = new Set([
        "aria-hidden",
        "d",
        "fill",
        "focusable",
        "viewBox",
        "cx",
        "cy",
        "r",
        "x1",
        "x2",
        "y1",
        "y2",
        "points",
        "stroke",
        "stroke-width",
    ]);
    for (const element of svg.querySelectorAll("*")) {
        if (!allowedElements.has(element.nodeName.toLowerCase())) {
            element.remove();
            continue;
        }
        for (const attribute of [...element.attributes]) {
            if (!allowedAttributes.has(attribute.name)) {
                element.removeAttribute(attribute.name);
            }
        }
    }
    for (const attribute of [...svg.attributes]) {
        if (!allowedAttributes.has(attribute.name))
            svg.removeAttribute(attribute.name);
    }
    return new XMLSerializer().serializeToString(svg);
}
