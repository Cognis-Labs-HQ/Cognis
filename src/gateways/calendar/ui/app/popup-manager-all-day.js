/**
 * Helpers for toggling all-day mode in the calendar event composer popup.
 *
 * Exports:
 * - isAllDayRange(startAt, endAt): checks if an event range is midnight-bounded.
 * - bindAllDayComposerControls({ overlay, signal }): wires all-day UI behavior.
 *
 * Example:
 * bindAllDayComposerControls({ overlay, signal });
 */
function isMidnightDate(dateValue) {
    return (
        dateValue.getHours() === 0 &&
        dateValue.getMinutes() === 0 &&
        dateValue.getSeconds() === 0 &&
        dateValue.getMilliseconds() === 0
    );
}

function toDateInputValue(value) {
    const parsed = new Date(String(value ?? ""));
    if (Number.isNaN(parsed.getTime())) return "";
    const year = String(parsed.getFullYear()).padStart(4, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function addDaysToDateInputValue(dateValue, daysToAdd) {
    const parsed = new Date(`${dateValue}T00:00`);
    if (Number.isNaN(parsed.getTime())) return "";
    parsed.setDate(parsed.getDate() + daysToAdd);
    const year = String(parsed.getFullYear()).padStart(4, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function buildAllDayDateRangeValues(startDateValue, endDateValue) {
    const normalizedStartDate = String(startDateValue ?? "").trim();
    const normalizedEndDate = String(endDateValue ?? "").trim();
    if (!normalizedStartDate || !normalizedEndDate) return null;
    const clampedEndDate =
        normalizedEndDate < normalizedStartDate
            ? normalizedStartDate
            : normalizedEndDate;
    const endExclusiveDate = addDaysToDateInputValue(clampedEndDate, 1);
    if (!endExclusiveDate) return null;
    return {
        startAt: `${normalizedStartDate}T00:00:00.000Z`,
        endAt: `${endExclusiveDate}T00:00:00.000Z`,
    };
}

/**
 * Determines whether start/end values represent an all-day event range.
 *
 * @param {string} startAt
 * @param {string} endAt
 * @returns {boolean}
 */
export function isAllDayRange(startAt, endAt) {
    const start = new Date(String(startAt ?? ""));
    const end = new Date(String(endAt ?? ""));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return false;
    }
    if (end.getTime() <= start.getTime()) return false;
    return isMidnightDate(start) && isMidnightDate(end);
}

/**
 * Binds all-day checkbox and date-range controls to composer start/end fields.
 *
 * @param {{ overlay: HTMLElement, signal?: AbortSignal }} options
 * @returns {void}
 */
export function bindAllDayComposerControls({ overlay, signal }) {
    const startInput = overlay.querySelector("#form-builder-startAt");
    const endInput = overlay.querySelector("#form-builder-endAt");
    const endField =
        endInput instanceof HTMLElement
            ? endInput.closest(".form-builder-field")
            : overlay.querySelector(`[data-form-builder-field="endAt"]`);
    const allDayToggle = overlay.querySelector("#calendar-popup-all-day");
    const allDayToggleRow =
        allDayToggle instanceof HTMLElement
            ? allDayToggle.closest(".calendar-all-day-toggle")
            : null;
    let timedStartValue =
        startInput instanceof HTMLInputElement
            ? String(startInput.value ?? "")
            : "";
    let timedEndValue =
        endInput instanceof HTMLInputElement
            ? String(endInput.value ?? "")
            : "";

    const dispatchFieldUpdates = () => {
        if (
            !(startInput instanceof HTMLInputElement) ||
            !(endInput instanceof HTMLInputElement)
        ) {
            return;
        }
        startInput.dispatchEvent(new Event("input", { bubbles: true }));
        endInput.dispatchEvent(new Event("input", { bubbles: true }));
    };

    const syncDateInputsFromTimeInputs = () => {
        if (
            !(startInput instanceof HTMLInputElement) ||
            !(endInput instanceof HTMLInputElement)
        ) {
            return;
        }
        const startDateValue = toDateInputValue(startInput.value);
        const endDateValue = toDateInputValue(endInput.value);
        if (!startDateValue) return;
        const parsedEnd = new Date(endInput.value);
        const parsedStart = new Date(startInput.value);
        const endsAtMidnight =
            !Number.isNaN(parsedEnd.getTime()) &&
            !Number.isNaN(parsedStart.getTime()) &&
            parsedEnd.getTime() > parsedStart.getTime() &&
            isMidnightDate(parsedEnd);
        startInput.value = "";
        endInput.value = "";
        startInput.type = "date";
        endInput.type = "date";
        startInput.value = startDateValue;
        endInput.value = endsAtMidnight
            ? addDaysToDateInputValue(endDateValue, -1)
            : endDateValue || startDateValue;
        endInput.min = startInput.value;
        dispatchFieldUpdates();
    };

    const syncDateInputsInAllDayMode = () => {
        if (
            !(startInput instanceof HTMLInputElement) ||
            !(endInput instanceof HTMLInputElement)
        ) {
            return;
        }
        const startDateValue = String(startInput.value ?? "").trim();
        const endDateValue = String(endInput.value ?? "").trim();
        if (!startDateValue || !endDateValue) return;
        const normalizedEndDate =
            endDateValue < startDateValue ? startDateValue : endDateValue;
        if (normalizedEndDate !== endDateValue) {
            endInput.value = normalizedEndDate;
        }
        endInput.min = startDateValue;
    };

    const setAllDayMode = (enabled) => {
        if (enabled) {
            if (
                startInput instanceof HTMLInputElement &&
                endInput instanceof HTMLInputElement
            ) {
                timedStartValue = String(startInput.value ?? "");
                timedEndValue = String(endInput.value ?? "");
            }
            syncDateInputsFromTimeInputs();
        } else if (
            startInput instanceof HTMLInputElement &&
            endInput instanceof HTMLInputElement
        ) {
            startInput.type = "datetime-local";
            endInput.type = "datetime-local";
            endInput.removeAttribute("min");
            if (timedStartValue && timedEndValue) {
                startInput.value = timedStartValue;
                endInput.value = timedEndValue;
            }
            dispatchFieldUpdates();
        }
    };

    if (
        allDayToggleRow instanceof HTMLElement &&
        endField instanceof HTMLElement &&
        allDayToggleRow.previousElementSibling !== endField
    ) {
        endField.insertAdjacentElement("afterend", allDayToggleRow);
    }

    if (allDayToggle instanceof HTMLInputElement) {
        setAllDayMode(allDayToggle.checked);
        allDayToggle.addEventListener(
            "change",
            () => setAllDayMode(allDayToggle.checked),
            { signal },
        );
    }

    if (startInput instanceof HTMLInputElement) {
        startInput.addEventListener(
            "input",
            () => {
                if (
                    allDayToggle instanceof HTMLInputElement &&
                    allDayToggle.checked
                ) {
                    syncDateInputsInAllDayMode();
                }
            },
            { signal },
        );
    }

    if (endInput instanceof HTMLInputElement) {
        endInput.addEventListener(
            "input",
            () => {
                if (
                    allDayToggle instanceof HTMLInputElement &&
                    allDayToggle.checked
                ) {
                    syncDateInputsInAllDayMode();
                }
            },
            { signal },
        );
    }
}
