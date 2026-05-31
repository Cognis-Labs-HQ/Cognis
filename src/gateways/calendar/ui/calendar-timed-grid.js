import { formatTime, getEffectiveTimezone } from "/static/reuse/timestamp.js";
import { escapeHtml } from "/static/reuse/escape-html.js";

const HALF_HOUR_MS = 30 * 60 * 1000;

function resolveRenderedEventRange(event, rangeStart, rangeEnd) {
    const startTime = Math.max(
        new Date(event.startAt).getTime(),
        rangeStart.getTime(),
    );
    const endTime = Math.min(
        new Date(event.endAt).getTime(),
        rangeEnd.getTime(),
    );
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return null;
    if (endTime <= startTime) return null;
    return {
        startTime,
        endTime,
    };
}

export function buildTimedEventLayout(events, rangeStart, rangeEnd) {
    const laidOutEvents = events
        .map((event) => {
            const renderedRange = resolveRenderedEventRange(
                event,
                rangeStart,
                rangeEnd,
            );
            if (!renderedRange) return null;
            return {
                event,
                ...renderedRange,
                columnIndex: 0,
                columnCount: 1,
            };
        })
        .filter(Boolean)
        .sort(
            (left, right) =>
                left.startTime - right.startTime ||
                left.endTime - right.endTime,
        );
    const groups = [];
    let activeEntries = [];
    let currentGroup = [];
    const finalizeGroup = () => {
        if (!currentGroup.length) return;
        const columnCount =
            Math.max(...currentGroup.map((entry) => entry.columnIndex)) + 1;
        currentGroup.forEach((entry) => {
            entry.columnCount = columnCount;
        });
        groups.push(...currentGroup);
        currentGroup = [];
    };
    laidOutEvents.forEach((entry) => {
        activeEntries = activeEntries.filter(
            (activeEntry) => activeEntry.endTime > entry.startTime,
        );
        if (activeEntries.length === 0) {
            finalizeGroup();
        }
        const occupiedColumns = new Set(
            activeEntries.map((activeEntry) => activeEntry.columnIndex),
        );
        let nextColumnIndex = 0;
        while (occupiedColumns.has(nextColumnIndex)) {
            nextColumnIndex += 1;
        }
        entry.columnIndex = nextColumnIndex;
        activeEntries.push(entry);
        currentGroup.push(entry);
    });
    finalizeGroup();
    return groups;
}

export function renderTimedEventLayer(
    events,
    rangeStart,
    rangeEnd,
    { i18n, renderEventButton, slotCount = 48, compact = false } = {},
) {
    const laidOutEvents = buildTimedEventLayout(events, rangeStart, rangeEnd);
    if (!laidOutEvents.length) return "";
    return `<div class="calendar-timed-event-layer">${laidOutEvents
        .map((entry) => {
            const offsetSlots =
                (entry.startTime - rangeStart.getTime()) / HALF_HOUR_MS;
            const spanSlots = Math.max(
                1,
                (entry.endTime - entry.startTime) / HALF_HOUR_MS,
            );
            const topPercent = (offsetSlots / slotCount) * 100;
            const heightPercent = (spanSlots / slotCount) * 100;
            const widthPercent = 100 / entry.columnCount;
            const leftPercent = widthPercent * entry.columnIndex;
            return `<div class="calendar-timed-event-card" style="top:${topPercent}%;height:${heightPercent}%;left:${leftPercent}%;width:${widthPercent}%;">${renderEventButton(
                entry.event,
                {
                    compact,
                    showTime: true,
                    i18n,
                },
            )}</div>`;
        })
        .join("")}</div>`;
}

export function renderTimeAxisRows(
    rangeStart,
    {
        slotClassName,
        labelClassName,
        currentSlotClassName = "",
        currentLabelClassName = "",
        includeDayData = false,
    },
) {
    const timezone = getEffectiveTimezone();
    const now = new Date();
    const dateFormatter = new Intl.DateTimeFormat("sv-SE", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    const todayInTimezone = dateFormatter.format(now);
    return Array.from({ length: 48 }, (_, slotIndex) => {
        const start = new Date(rangeStart.getTime() + slotIndex * HALF_HOUR_MS);
        const end = new Date(start.getTime() + HALF_HOUR_MS);
        const timeLabel = formatTime(start.toISOString(), "", {
            hour: "2-digit",
            minute: "2-digit",
        });
        const isCurrentSlot =
            dateFormatter.format(start) === todayInTimezone &&
            now.getTime() >= start.getTime() &&
            now.getTime() < end.getTime();
        const slotClassNames = [
            slotClassName,
            isCurrentSlot ? currentSlotClassName : "",
        ]
            .filter(Boolean)
            .join(" ");
        const labelClassNames = [
            labelClassName,
            isCurrentSlot ? currentLabelClassName : "",
        ]
            .filter(Boolean)
            .join(" ");
        const dataAttributes = includeDayData
            ? ` data-slot-start="${start.toISOString()}" data-slot-end="${end.toISOString()}" data-timeslot-events`
            : "";
        return {
            slotMarkup: `<div class="${slotClassNames}"${dataAttributes}></div>`,
            labelMarkup: `<div class="${labelClassNames}">${escapeHtml(timeLabel)}</div>`,
            start,
            end,
        };
    });
}
