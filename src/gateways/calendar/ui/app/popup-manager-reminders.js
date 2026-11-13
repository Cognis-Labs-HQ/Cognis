import { renderInfoTooltip } from "/static/reuse/info-tooltip.js";

const REMINDER_OFFSET_OPTIONS = [
    { minutes: 5, key: "gateway.calendar.reminder_5m" },
    { minutes: 10, key: "gateway.calendar.reminder_10m" },
    { minutes: 15, key: "gateway.calendar.reminder_15m" },
    { minutes: 30, key: "gateway.calendar.reminder_30m" },
    { minutes: 60, key: "gateway.calendar.reminder_1h" },
    { minutes: 24 * 60, key: "gateway.calendar.reminder_1d" },
    { minutes: 7 * 24 * 60, key: "gateway.calendar.reminder_1w" },
];

export function normalizeReminderOffsets(value) {
    const maxReminderOffsetMinutes = 7 * 24 * 60 * 52;
    if (!Array.isArray(value)) return [];
    return Array.from(
        new Set(
            value
                .map((entry) =>
                    typeof entry === "number" ? entry : Number(entry),
                )
                .filter(
                    (entry) =>
                        Number.isFinite(entry) &&
                        entry > 0 &&
                        entry <= maxReminderOffsetMinutes,
                )
                .map((entry) => Math.trunc(entry)),
        ),
    ).sort((left, right) => left - right);
}

export function getSelectedReminderOffsets(overlay) {
    return normalizeReminderOffsets(
        Array.from(
            overlay.querySelectorAll(
                'input[name="calendar-popup-reminder-offset"]:checked',
            ),
        ).map((input) => input.value),
    );
}

export function renderReminderField({
    i18n,
    escapeHtml,
    selectedOffsets,
    showDefaultTooltip = false,
}) {
    const selectedSet = new Set(normalizeReminderOffsets(selectedOffsets));
    const options = [...REMINDER_OFFSET_OPTIONS];
    for (const minutes of selectedSet) {
        if (!options.some((option) => option.minutes === minutes)) {
            options.push({ minutes, key: "gateway.calendar.reminder_minutes" });
        }
    }
    options.sort((left, right) => left.minutes - right.minutes);
    const reminderHeading = `${escapeHtml(i18n.t("gateway.calendar.event_reminders"))}${showDefaultTooltip ? ` ${renderInfoTooltip(i18n.t("gateway.calendar.reminders_default_tooltip"), i18n.t("ui.reuse.more_information"), "calendar-reminders-default")}` : ""}`;
    return `<div class="form-builder-field calendar-reminder-field">
      <span class="form-builder-label-text">${reminderHeading}</span>
      <div id="calendar-popup-reminder-offsets" class="calendar-reminder-options" role="group" aria-label="${escapeHtml(i18n.t("gateway.calendar.event_reminders"))}">
        ${options.map((option) => `<label class="calendar-checkbox-row calendar-checkbox-row--styled"><input class="choice-checkbox" type="checkbox" name="calendar-popup-reminder-offset" value="${option.minutes}"${selectedSet.has(option.minutes) ? " checked" : ""} /><span>${escapeHtml(i18n.t(option.key).replace("{minutes}", String(option.minutes)))}</span></label>`).join("")}
      </div>
    </div>`;
}
