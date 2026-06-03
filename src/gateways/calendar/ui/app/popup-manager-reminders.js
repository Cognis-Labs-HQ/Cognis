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

export function renderReminderField({ i18n, escapeHtml, selectedOffsets }) {
    const selectedSet = new Set(normalizeReminderOffsets(selectedOffsets));
    return `<label class="form-builder-field calendar-reminder-field">
      <span class="form-builder-label-text">${escapeHtml(i18n.t("gateway.calendar.event_reminders"))}</span>
      <div id="calendar-popup-reminder-offsets" class="calendar-reminder-options" role="group">
        ${REMINDER_OFFSET_OPTIONS.map((option) => `<label class="calendar-reminder-option"><input type="checkbox" name="calendar-popup-reminder-offset" value="${option.minutes}"${selectedSet.has(option.minutes) ? " checked" : ""} /> <span>${escapeHtml(i18n.t(option.key))}</span></label>`).join("")}
      </div>
    </label>`;
}
