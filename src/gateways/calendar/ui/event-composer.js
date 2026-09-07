import { createFormBuilder } from "/static/reuse/form-builder.js";
import { escapeHtml } from "/static/reuse/escape-html.js";

const EVENT_STATUS_OPTIONS = ["busy", "free"];
const EVENT_RECURRENCE_OPTIONS = [
    "none",
    "daily",
    "weekly",
    "monthly",
    "yearly",
];

function getStatusLabelKey(status) {
    return `gateway.calendar.event_status_${status}`;
}

function getRecurrenceLabelKey(recurrence) {
    return `gateway.calendar.recurrence_${recurrence}`;
}

export function createEventComposerBuilder({
    i18n,
    defaultValues = {},
    calendars = [],
    selectedCalendarId = "",
    readOnly = false,
}) {
    const calendarOptions = Array.isArray(calendars)
        ? calendars
              .filter(
                  (calendar) =>
                      calendar?.visibility !== "shared" ||
                      calendar?.sharedPermission === "write",
              )
              .map((calendar) => ({
                  value: String(calendar?.id ?? ""),
                  label: String(calendar?.name ?? ""),
              }))
        : [];
    const requestedCalendarId = String(
        defaultValues.calendarId ?? selectedCalendarId ?? "",
    );
    const selectedWritableCalendarId = calendarOptions.some(
        (option) => option.value === requestedCalendarId,
    )
        ? requestedCalendarId
        : (calendarOptions[0]?.value ?? "");
    const fields = [
        {
            name: "title",
            labelKey: "gateway.calendar.event_title",
            required: true,
            maxCharacters: 120,
            value: String(defaultValues.title ?? ""),
            disabled: readOnly,
        },
        {
            name: "description",
            labelKey: "gateway.calendar.event_description",
            type: "textarea",
            value: String(defaultValues.description ?? ""),
            disabled: readOnly,
        },
        {
            name: "startAt",
            labelKey: "gateway.calendar.event_start",
            type: "datetime-local",
            required: true,
            value: String(defaultValues.startAt ?? ""),
            disabled: readOnly,
        },
        {
            name: "endAt",
            labelKey: "gateway.calendar.event_end",
            type: "datetime-local",
            required: true,
            value: String(defaultValues.endAt ?? ""),
            disabled: readOnly,
            criteria: [
                {
                    id: "event-range",
                    type: "custom",
                    mode: "submit",
                    test: (value, fieldValues) => {
                        const endValue = String(value ?? "");
                        const startValue = String(fieldValues.startAt ?? "");
                        const endTime = new Date(endValue).getTime();
                        const startTime = new Date(startValue).getTime();
                        if (Number.isNaN(endTime) || Number.isNaN(startTime)) {
                            return false;
                        }
                        if (endTime > startTime) return true;
                        const isDateOnlyRange =
                            !startValue.includes("T") &&
                            !endValue.includes("T");
                        return isDateOnlyRange && endTime === startTime;
                    },
                    messageKey: "gateway.calendar.event_end_after_start",
                },
            ],
        },
        {
            name: "status",
            labelKey: "gateway.calendar.event_status",
            type: "select",
            value: String(defaultValues.status ?? "busy"),
            disabled: readOnly,
            options: EVENT_STATUS_OPTIONS.map((status) => ({
                value: status,
                label: i18n.t(getStatusLabelKey(status)),
            })),
        },
        {
            name: "recurrence",
            labelKey: "gateway.calendar.event_recurrence",
            type: "select",
            value: String(defaultValues.recurrence ?? "none"),
            disabled: readOnly,
            options: EVENT_RECURRENCE_OPTIONS.map((recurrence) => ({
                value: recurrence,
                label: i18n.t(getRecurrenceLabelKey(recurrence)),
            })),
        },
        {
            name: "calendarId",
            labelKey: "gateway.calendar.event_calendar",
            type: "select",
            required: true,
            value: selectedWritableCalendarId,
            options:
                calendarOptions.length > 0
                    ? calendarOptions
                    : [
                          {
                              value: "",
                              label: i18n.t("gateway.calendar.no_calendars"),
                              disabled: true,
                          },
                      ],
            disabled: readOnly || calendarOptions.length === 0,
        },
    ];

    return createFormBuilder(
        {
            i18n,
            escapeHtml,
        },
        {
            formId: "calendar-event-form",
            fields,
            submitButtonClassName: "btn-confirm",
            formClassName: "calendar-event-form-builder",
            includeSubmitButton: false,
        },
    );
}
