/**
 * Renders responsive timeline dot graphs with automatically scaled axes and
 * accessible hover/focus detail popups.
 *
 * Public exports:
 *   mountDotGraph(container, options) — mounts a scalable SVG dot graph.
 *
 * Usage:
 *   mountDotGraph(element, {
 *     points: [{ timestamp: new Date().toISOString(), detail: 'Created' }],
 *     xAxisLabel: 'Timeline',
 *     yAxisLabel: 'Event Count',
 *     formatTimestamp: (value) => new Date(value).toLocaleString(),
 *   });
 *
 * @param {HTMLElement} container - Element that will contain the graph.
 * @param {{ points: Array<{ timestamp: string, detail: string, category?: string }>, xAxisLabel: string, yAxisLabel: string, formatTimestamp: (timestamp: string) => string, formatAxisTimestamp?: (timestamp: string) => string }} options - Graph data and localized labels.
 * @returns {void}
 */
export function mountDotGraph(
    container,
    {
        points,
        xAxisLabel,
        yAxisLabel,
        formatTimestamp,
        formatAxisTimestamp = formatTimestamp,
    },
) {
    const normalized = (Array.isArray(points) ? points : [])
        .map((point) => ({ ...point, time: Date.parse(point.timestamp) }))
        .filter((point) => Number.isFinite(point.time))
        .sort((left, right) => left.time - right.time);
    const width = 720;
    const height = 260;
    const margin = { top: 20, right: 24, bottom: 54, left: 58 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const minimumTime = normalized[0]?.time ?? Date.now();
    const maximumTime = normalized.at(-1)?.time ?? minimumTime;
    const timeSpan = Math.max(1, maximumTime - minimumTime);
    const plotted = normalized.map((point, index) => ({
        ...point,
        count: index + 1,
    }));
    const maximumCount = Math.max(1, ...plotted.map((point) => point.count));
    const x = (time) =>
        margin.left + ((time - minimumTime) / timeSpan) * plotWidth;
    const y = (count) =>
        margin.top + plotHeight - (count / maximumCount) * plotHeight;
    const svgNamespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNamespace, "svg");
    svg.classList.add("dot-graph");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${yAxisLabel}; ${xAxisLabel}`);
    const axis = document.createElementNS(svgNamespace, "path");
    axis.classList.add("dot-graph-axis");
    axis.setAttribute(
        "d",
        `M ${margin.left} ${margin.top} V ${margin.top + plotHeight} H ${margin.left + plotWidth}`,
    );
    svg.appendChild(axis);

    const addLabel = (text, xPosition, yPosition, className) => {
        const label = document.createElementNS(svgNamespace, "text");
        label.classList.add(className);
        label.setAttribute("x", String(xPosition));
        label.setAttribute("y", String(yPosition));
        label.textContent = text;
        svg.appendChild(label);
    };
    addLabel(yAxisLabel, 16, margin.top + plotHeight / 2, "dot-graph-y-label");
    addLabel(
        xAxisLabel,
        margin.left + plotWidth / 2,
        height - 8,
        "dot-graph-x-label",
    );
    addLabel(
        String(maximumCount),
        margin.left - 12,
        margin.top + 4,
        "dot-graph-tick",
    );
    addLabel(
        "0",
        margin.left - 12,
        margin.top + plotHeight + 4,
        "dot-graph-tick",
    );
    addLabel(
        formatAxisTimestamp(new Date(minimumTime).toISOString()),
        margin.left,
        height - 27,
        "dot-graph-time-start",
    );
    addLabel(
        formatAxisTimestamp(new Date(maximumTime).toISOString()),
        margin.left + plotWidth,
        height - 27,
        "dot-graph-time-end",
    );

    const tooltip = document.createElement("div");
    tooltip.className = "dot-graph-tooltip";
    tooltip.hidden = true;
    const showTooltip = (point, circle) => {
        tooltip.replaceChildren();
        const detail = document.createElement("strong");
        detail.textContent = point.detail;
        const timestamp = document.createElement("span");
        timestamp.textContent = formatTimestamp(point.timestamp);
        tooltip.append(detail, timestamp);
        tooltip.hidden = false;
        tooltip.style.left = `${(Number(circle.getAttribute("cx")) / width) * 100}%`;
        tooltip.style.top = `${(Number(circle.getAttribute("cy")) / height) * 100}%`;
    };
    const hideTooltip = () => {
        tooltip.hidden = true;
    };
    for (const point of plotted) {
        const circle = document.createElementNS(svgNamespace, "circle");
        circle.classList.add("dot-graph-point");
        if (point.category) circle.dataset.category = point.category;
        circle.setAttribute("cx", String(x(point.time)));
        circle.setAttribute("cy", String(y(point.count)));
        circle.setAttribute("r", "6");
        circle.setAttribute("tabindex", "0");
        circle.setAttribute(
            "aria-label",
            `${point.detail}, ${formatTimestamp(point.timestamp)}`,
        );
        circle.addEventListener("pointerenter", () =>
            showTooltip(point, circle),
        );
        circle.addEventListener("pointerleave", hideTooltip);
        circle.addEventListener("focus", () => showTooltip(point, circle));
        circle.addEventListener("blur", hideTooltip);
        svg.appendChild(circle);
    }
    container.replaceChildren(svg, tooltip);
}
