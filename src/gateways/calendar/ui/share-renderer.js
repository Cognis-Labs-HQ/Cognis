import { formatDateTime } from "/static/reuse/timestamp.js";
import { showToast } from "/static/reuse/toast.js";

function appendTextElement(parent, tagName, text) {
    const element = document.createElement(tagName);
    element.textContent = String(text ?? "");
    parent.append(element);
    return element;
}

function appendEvent(container, event) {
    const article = document.createElement("article");
    appendTextElement(article, "h3", event.title);
    appendTextElement(
        article,
        "p",
        `${formatDateTime(event.startAt)} – ${formatDateTime(event.endAt)}`,
    );
    if (event.description) {
        appendTextElement(article, "p", event.description);
    }
    container.append(article);
}

function appendField(form, { label, name, type = "text" }) {
    const field = document.createElement("label");
    const labelText = document.createElement("span");
    labelText.textContent = label;
    const input = document.createElement("input");
    input.name = name;
    input.type = type;
    input.required = true;
    field.append(labelText, input);
    form.append(field);
}

function appendEventForm(
    section,
    { calendarId, guestAccessToken, i18n, signal },
) {
    const form = document.createElement("form");
    form.className = "shared-calendar-event-form";
    appendField(form, {
        label: i18n.t("gateway.calendar.event_title"),
        name: "title",
    });
    appendField(form, {
        label: i18n.t("gateway.calendar.event_start"),
        name: "startAt",
        type: "datetime-local",
    });
    appendField(form, {
        label: i18n.t("gateway.calendar.event_end"),
        name: "endAt",
        type: "datetime-local",
    });
    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.className = "btn-confirm";
    submitButton.textContent = i18n.t("gateway.calendar.create_event");
    form.append(submitButton);
    form.addEventListener(
        "submit",
        async (event) => {
            event.preventDefault();
            const response = await fetch(
                `/api/v1/calendar/shared/${encodeURIComponent(calendarId)}/events`,
                {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        ...(guestAccessToken
                            ? {
                                  authorization: `Bearer ${guestAccessToken}`,
                              }
                            : {}),
                    },
                    body: JSON.stringify(
                        Object.fromEntries(new FormData(form)),
                    ),
                },
            );
            showToast(
                i18n.t(
                    response.ok
                        ? "gateway.calendar.create_event_success"
                        : "gateway.calendar.create_event_failed",
                ),
                { variant: response.ok ? "success" : "error" },
            );
            if (response.ok) globalThis.location.reload();
        },
        { signal },
    );
    section.append(form);
}

export async function mount(
    root,
    { shareContext, i18n, signal = new AbortController().signal } = {},
) {
    const calendar = shareContext?.payload?.calendar ?? {};
    const events = Array.isArray(shareContext?.payload?.events)
        ? shareContext.payload.events
        : [];
    const section = document.createElement("section");
    section.className = "shared-calendar";
    appendTextElement(
        section,
        "h2",
        calendar.name || i18n.t("gateway.calendar.page_title"),
    );
    const eventList = document.createElement("div");
    eventList.className = "shared-calendar-events";
    if (events.length === 0) {
        appendTextElement(
            eventList,
            "p",
            i18n.t("gateway.calendar.share_no_events"),
        );
    } else {
        for (const event of events) appendEvent(eventList, event);
    }
    section.append(eventList);
    if (shareContext?.grantedCapabilities?.includes("calendar:write")) {
        appendEventForm(section, {
            calendarId: calendar.id,
            guestAccessToken: shareContext.guestAccessToken,
            i18n,
            signal,
        });
    }
    root.replaceChildren(section);
}
