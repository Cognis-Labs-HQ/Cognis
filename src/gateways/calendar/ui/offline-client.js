import { apiFetch } from "/static/reuse/api-client.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { registerOfflineHttpClient } from "/static/reuse/offline-http-client.js";

const ROOT = "/api/v1/calendar";
export function registerCalendarClient(ctx) {
    let calendarIds = [];
    const describe = (path, method) => {
        const relative = path.slice(ROOT.length).split("?")[0];
        if (
            method === "GET" &&
            /^\/(?:calendars(?:\/[^/]+\/events(?:\/[^/]+)?)?|invitations|upcoming-events|status-preference)$/.test(
                relative,
            )
        )
            return {};
        if (relative === "/status-preference" && method === "PUT")
            return { write: true };
        if (/^\/calendars\/[^/]+\/events$/.test(relative) && method === "POST")
            return {
                write: true,
                create: true,
                optimistic: (operation) => eventFromOperation(operation),
            };
        if (
            /^\/calendars\/[^/]+(?:\/events\/[^/]+)?$/.test(relative) &&
            ["PATCH", "DELETE"].includes(method)
        )
            return { write: true };
        if (
            /^\/calendars\/[^/]+\/events\/[^/]+\/respond$/.test(relative) &&
            method === "POST"
        )
            return { write: true };
        return null;
    };
    function eventFromOperation(operation) {
        const calendarId = decodeURIComponent(operation.path.split("/")[5]);
        return {
            ...operation.body,
            id: operation.body.operationId,
            calendarId,
            createdBy: localStorage.getItem("cognis_account"),
            createdAt: operation.createdAt,
            updatedAt: operation.createdAt,
            status: operation.body.status ?? "busy",
            recurrence: operation.body.recurrence ?? "none",
            recurrenceId: null,
            responses: {},
            queued: true,
        };
    }
    function project(path, payload, pending) {
        const base = path.split("?")[0];
        if (base === `${ROOT}/calendars` && Array.isArray(payload.data)) {
            calendarIds = payload.data.map((calendar) => calendar.id);
            for (const { payload: operation } of pending) {
                if (operation.method === "DELETE")
                    payload.data = payload.data.filter(
                        (calendar) =>
                            operation.path !==
                            `${ROOT}/calendars/${encodeURIComponent(calendar.id)}`,
                    );
                if (operation.method === "PATCH")
                    for (const calendar of payload.data)
                        if (
                            operation.path ===
                            `${ROOT}/calendars/${encodeURIComponent(calendar.id)}`
                        )
                            Object.assign(calendar, operation.body);
            }
        }
        const listing = /^\/api\/v1\/calendar\/calendars\/[^/]+\/events$/.test(
            base,
        );
        if (listing && Array.isArray(payload.data?.events)) {
            for (const { payload: operation } of pending) {
                const target = operation.path.split("?")[0];
                if (target === base && operation.method === "POST")
                    if (
                        !payload.data.events.some(
                            (event) => event.id === operation.body.operationId,
                        )
                    )
                        payload.data.events.push(eventFromOperation(operation));
                if (
                    target.startsWith(base + "/") &&
                    target.endsWith("/respond") &&
                    operation.method === "POST"
                ) {
                    const id = decodeURIComponent(
                        target.slice(base.length + 1, -"/respond".length),
                    );
                    for (const event of payload.data.events)
                        if (event.id === id) {
                            event.responses = {
                                ...event.responses,
                                [localStorage.getItem("cognis_account")]:
                                    operation.body.response,
                            };
                            event.queued = true;
                        }
                }
                if (
                    target.startsWith(base + "/") &&
                    !target.endsWith("/respond")
                ) {
                    const id = decodeURIComponent(
                        target.slice(base.length + 1),
                    );
                    if (operation.method === "DELETE")
                        payload.data.events = payload.data.events.filter(
                            (event) => event.id !== id,
                        );
                    if (operation.method === "PATCH")
                        for (const event of payload.data.events)
                            if (event.id === id)
                                Object.assign(event, operation.body, {
                                    queued: true,
                                });
                }
            }
        }
        if (base === `${ROOT}/invitations` && Array.isArray(payload.data))
            payload.data = payload.data.filter(
                (event) =>
                    !pending.some(
                        ({ payload: operation }) =>
                            operation.method === "POST" &&
                            operation.path
                                .split("?")[0]
                                .endsWith(
                                    `/events/${encodeURIComponent(event.id)}/respond`,
                                ),
                    ),
            );
        for (const { payload: operation } of pending) {
            if (
                operation.path === base &&
                operation.method === "PATCH" &&
                payload.data &&
                !listing
            )
                Object.assign(
                    payload.data.event ?? payload.data,
                    operation.body,
                    { queued: true },
                );
            if (
                base === `${ROOT}/status-preference` &&
                operation.path === base &&
                operation.method === "PUT"
            )
                payload.data = operation.body;
        }
        return payload;
    }
    const request = registerOfflineHttpClient(ctx, {
        owner: "calendar.events",
        describe,
        project,
        request: async (path, options) => {
            const response = await apiFetch(path, options);
            return options?.method === "DELETE" && response.status === 404
                ? Response.json({ data: null })
                : response;
        },
    });
    ctx.capabilities.contribute("calendar:request", request);
    ctx.capabilities.get("offline:registerSessionRoutes")?.(
        ["calendar-page"],
        ctx.signal,
        {
            available: (_route, path) => {
                const selected = path
                    ? new URL(path, window.location.origin).searchParams.get(
                          "calendarId",
                      )
                    : null;
                const id = selected ?? calendarIds[0];
                return (
                    request.hasCachedRead(`${ROOT}/calendars`) &&
                    (!id ||
                        request.hasCachedRead(
                            `${ROOT}/calendars/${encodeURIComponent(id)}/events`,
                        ))
                );
            },
        },
    );
}

export function calendarFetch(path, options = {}) {
    if (
        !path.startsWith(ROOT) ||
        new Headers(options.headers).has("x-cognis-share-password") ||
        options.accessToken
    )
        return apiFetch(path, options);
    const request = uiCtx.capabilities.get("calendar:request");
    return request ? request(path, options) : apiFetch(path, options);
}
