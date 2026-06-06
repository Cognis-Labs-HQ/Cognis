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

function buildReminderSummary(i18n, offsets) {
    if (offsets.length === 0) return i18n.t("gateway.calendar.reminder_none");
    const selectedSet = new Set(offsets);
    return REMINDER_OFFSET_OPTIONS.filter((option) =>
        selectedSet.has(option.minutes),
    )
        .map((option) => i18n.t(option.key))
        .join(", ");
}

export function bindReminderFieldBehavior({ overlay, i18n, signal }) {
    const reminderDetails = overlay.querySelector(
        "#calendar-popup-reminder-menu",
    );
    const summaryText = overlay.querySelector(
        "#calendar-popup-reminder-summary",
    );
    if (!(reminderDetails instanceof HTMLElement)) return;
    const refreshSummary = () => {
        if (!(summaryText instanceof HTMLElement)) return;
        summaryText.textContent = buildReminderSummary(
            i18n,
            getSelectedReminderOffsets(overlay),
        );
    };
    reminderDetails.addEventListener("change", refreshSummary, { signal });
    refreshSummary();
}

export function renderReminderField({
    i18n,
    escapeHtml,
    selectedOffsets,
    showDefaultTooltip = false,
}) {
    const selectedSet = new Set(normalizeReminderOffsets(selectedOffsets));
    const reminderHeading = `${escapeHtml(i18n.t("gateway.calendar.event_reminders"))}${showDefaultTooltip ? ` ${renderInfoTooltip(i18n.t("gateway.calendar.reminders_default_tooltip"), i18n.t("ui.reuse.more_information"), "calendar-reminders-default")}` : ""}`;
    const selectedSummary = buildReminderSummary(i18n, [...selectedSet]);
    return `<label class="form-builder-field calendar-reminder-field">
      <span class="form-builder-label-text">${reminderHeading}</span>
      <details id="calendar-popup-reminder-menu" class="calendar-reminder-menu">
        <summary class="calendar-reminder-menu-summary"><span id="calendar-popup-reminder-summary">${escapeHtml(selectedSummary)}</span></summary>
        <div id="calendar-popup-reminder-offsets" class="calendar-reminder-options" role="group">
          ${REMINDER_OFFSET_OPTIONS.map((option) => `<label class="calendar-reminder-option"><input type="checkbox" name="calendar-popup-reminder-offset" value="${option.minutes}"${selectedSet.has(option.minutes) ? " checked" : ""} /> <span>${escapeHtml(i18n.t(option.key))}</span></label>`).join("")}
        </div>
      </details>
    </label>`;
}
