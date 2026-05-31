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
    const startField =
        startInput instanceof HTMLElement
            ? startInput.closest(".form-builder-field")
            : overlay.querySelector('[data-form-builder-field="startAt"]');
    const endField =
        endInput instanceof HTMLElement
            ? endInput.closest(".form-builder-field")
            : overlay.querySelector('[data-form-builder-field="endAt"]');
    const allDayToggle = overlay.querySelector("#calendar-popup-all-day");
    const allDayRange = overlay.querySelector("#calendar-popup-all-day-range");
    const allDayStartDateInput = overlay.querySelector(
        "#calendar-popup-all-day-start-date",
    );
    const allDayEndDateInput = overlay.querySelector(
        "#calendar-popup-all-day-end-date",
    );
    let timedStartValue =
        startInput instanceof HTMLInputElement
            ? String(startInput.value ?? "")
            : "";
    let timedEndValue =
        endInput instanceof HTMLInputElement
            ? String(endInput.value ?? "")
            : "";

    const syncDateRangeFromTimeInputs = () => {
        if (
            !(startInput instanceof HTMLInputElement) ||
            !(endInput instanceof HTMLInputElement) ||
            !(allDayStartDateInput instanceof HTMLInputElement) ||
            !(allDayEndDateInput instanceof HTMLInputElement)
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
        allDayStartDateInput.value = startDateValue;
        allDayEndDateInput.value = endsAtMidnight
            ? addDaysToDateInputValue(endDateValue, -1)
            : endDateValue || startDateValue;
    };

    const syncTimeInputsFromDateRange = () => {
        if (
            !(startInput instanceof HTMLInputElement) ||
            !(endInput instanceof HTMLInputElement) ||
            !(allDayStartDateInput instanceof HTMLInputElement) ||
            !(allDayEndDateInput instanceof HTMLInputElement)
        ) {
            return;
        }
        const startDateValue = String(allDayStartDateInput.value ?? "").trim();
        const endDateValue = String(allDayEndDateInput.value ?? "").trim();
        if (!startDateValue || !endDateValue) return;
        const normalizedEndDate =
            endDateValue < startDateValue ? startDateValue : endDateValue;
        if (normalizedEndDate !== endDateValue) {
            allDayEndDateInput.value = normalizedEndDate;
        }
        startInput.value = `${startDateValue}T00:00`;
        endInput.value = `${addDaysToDateInputValue(normalizedEndDate, 1)}T00:00`;
        startInput.dispatchEvent(new Event("input", { bubbles: true }));
        endInput.dispatchEvent(new Event("input", { bubbles: true }));
    };

    const setAllDayMode = (enabled) => {
        if (
            !(allDayRange instanceof HTMLElement) ||
            !(startField instanceof HTMLElement) ||
            !(endField instanceof HTMLElement)
        ) {
            return;
        }
        if (enabled) {
            if (
                startInput instanceof HTMLInputElement &&
                endInput instanceof HTMLInputElement
            ) {
                timedStartValue = String(startInput.value ?? "");
                timedEndValue = String(endInput.value ?? "");
            }
            syncDateRangeFromTimeInputs();
            syncTimeInputsFromDateRange();
        } else if (
            startInput instanceof HTMLInputElement &&
            endInput instanceof HTMLInputElement &&
            timedStartValue &&
            timedEndValue
        ) {
            startInput.value = timedStartValue;
            endInput.value = timedEndValue;
            startInput.dispatchEvent(new Event("input", { bubbles: true }));
            endInput.dispatchEvent(new Event("input", { bubbles: true }));
        }
        startField.hidden = enabled;
        endField.hidden = enabled;
        if (enabled) {
            startField.style.display = "none";
            endField.style.display = "none";
        } else {
            startField.style.removeProperty("display");
            endField.style.removeProperty("display");
        }
        allDayRange.hidden = !enabled;
    };

    if (
        allDayToggle instanceof HTMLInputElement &&
        allDayStartDateInput instanceof HTMLInputElement &&
        allDayEndDateInput instanceof HTMLInputElement
    ) {
        setAllDayMode(allDayToggle.checked);
        allDayToggle.addEventListener(
            "change",
            () => setAllDayMode(allDayToggle.checked),
            { signal },
        );
        allDayStartDateInput.addEventListener(
            "input",
            syncTimeInputsFromDateRange,
            {
                signal,
            },
        );
        allDayEndDateInput.addEventListener(
            "input",
            syncTimeInputsFromDateRange,
            {
                signal,
            },
        );
    }
}
