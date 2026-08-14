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
 * @param {{ points: Array<{ timestamp: string, detail: string, category?: string }>, xAxisLabel: string, yAxisLabel: string, formatTimestamp: (timestamp: string) => string, formatTimeTimestamp?: (timestamp: string) => string, formatDateTimestamp?: (timestamp: string) => string, domainStart?: string, domainEnd?: string, onEmptySelection?: () => void }} options - Graph data and localized labels.
 * @returns {void}
 */
export function mountDotGraph(
    container,
    {
        points,
        xAxisLabel,
        yAxisLabel,
        formatTimestamp,
        formatTimeTimestamp = formatTimestamp,
        formatDateTimestamp = formatTimestamp,
        domainStart,
        domainEnd,
        onEmptySelection,
    },
) {
    const normalized = (Array.isArray(points) ? points : [])
        .map((point) => ({ ...point, time: Date.parse(point.timestamp) }))
        .filter((point) => Number.isFinite(point.time))
        .sort((left, right) => left.time - right.time);
    const width = 720;
    const height = 280;
    const margin = { top: 20, right: 24, bottom: 74, left: 58 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const requestedMinimumTime = Date.parse(domainStart ?? "");
    const requestedMaximumTime = Date.parse(domainEnd ?? "");
    const minimumTime = Number.isFinite(requestedMinimumTime)
        ? requestedMinimumTime
        : (normalized[0]?.time ?? Date.now());
    const maximumTime = Number.isFinite(requestedMaximumTime)
        ? requestedMaximumTime
        : (normalized.at(-1)?.time ?? minimumTime);
    const timeSpan = Math.max(1, maximumTime - minimumTime);
    const axisTimestampFormatter =
        timeSpan <= 2 * 24 * 60 * 60 * 1000
            ? formatTimeTimestamp
            : formatDateTimestamp;
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
        axisTimestampFormatter(new Date(minimumTime).toISOString()),
        margin.left,
        height - 45,
        "dot-graph-time-start",
    );
    addLabel(
        axisTimestampFormatter(new Date(maximumTime).toISOString()),
        margin.left + plotWidth,
        height - 45,
        "dot-graph-time-end",
    );
    if (axisTimestampFormatter === formatTimeTimestamp) {
        const startDate = formatDateTimestamp(
            new Date(minimumTime).toISOString(),
        );
        const endDate = formatDateTimestamp(
            new Date(maximumTime).toISOString(),
        );
        if (startDate === endDate) {
            addLabel(
                startDate,
                margin.left + plotWidth / 2,
                height - 27,
                "dot-graph-date-shared",
            );
        } else {
            addLabel(
                startDate,
                margin.left,
                height - 27,
                "dot-graph-date-start",
            );
            addLabel(
                endDate,
                margin.left + plotWidth,
                height - 27,
                "dot-graph-date-end",
            );
        }
    }

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
    let selectionStart = null;
    const selection = document.createElementNS(svgNamespace, "rect");
    selection.classList.add("dot-graph-selection");
    selection.setAttribute("y", String(margin.top));
    selection.setAttribute("height", String(plotHeight));
    selection.setAttribute("visibility", "hidden");
    const pointerX = (event) => {
        const point = svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        const matrix = svg.getScreenCTM();
        const svgPoint = matrix
            ? point.matrixTransform(matrix.inverse())
            : point;
        return Math.min(
            margin.left + plotWidth,
            Math.max(margin.left, svgPoint.x),
        );
    };
    svg.addEventListener("pointerdown", (event) => {
        selectionStart = pointerX(event);
        selection.setAttribute("visibility", "visible");
        selection.setAttribute("x", String(selectionStart));
        selection.setAttribute("width", "0");
        svg.setPointerCapture(event.pointerId);
    });
    svg.addEventListener("pointermove", (event) => {
        if (selectionStart === null) return;
        const current = pointerX(event);
        selection.setAttribute("x", String(Math.min(selectionStart, current)));
        selection.setAttribute(
            "width",
            String(Math.abs(current - selectionStart)),
        );
    });
    svg.addEventListener("pointerup", (event) => {
        if (selectionStart === null) return;
        const selectionEnd = pointerX(event);
        const lowerX = Math.min(selectionStart, selectionEnd);
        const upperX = Math.max(selectionStart, selectionEnd);
        selectionStart = null;
        selection.setAttribute("visibility", "hidden");
        svg.releasePointerCapture(event.pointerId);
        if (upperX - lowerX < 8) return;
        const toTime = (position) =>
            minimumTime + ((position - margin.left) / plotWidth) * timeSpan;
        const selectedMinimumTime = toTime(lowerX);
        const selectedMaximumTime = toTime(upperX);
        const selectedPoints = normalized.filter(
            (point) =>
                point.time >= selectedMinimumTime &&
                point.time <= selectedMaximumTime,
        );
        if (selectedPoints.length === 0) {
            onEmptySelection?.();
            return;
        }
        mountDotGraph(container, {
            points: selectedPoints,
            xAxisLabel,
            yAxisLabel,
            formatTimestamp,
            formatTimeTimestamp,
            formatDateTimestamp,
            domainStart: new Date(selectedMinimumTime).toISOString(),
            domainEnd: new Date(selectedMaximumTime).toISOString(),
            onEmptySelection,
        });
    });
    svg.addEventListener("pointercancel", () => {
        selectionStart = null;
        selection.setAttribute("visibility", "hidden");
    });
    svg.insertBefore(selection, svg.querySelector(".dot-graph-point"));
    container.replaceChildren(svg, tooltip);
}
