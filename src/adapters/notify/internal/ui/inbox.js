import { apiFetch } from "/static/reuse/api-client.js";

const READ_FLOW = "notify:internal:readInbox";
const MUTATE_FLOW = "notify:internal:mutateInbox";
const ENDPOINT = "/api/v1/notify/inbox";

function validateRows(payload) {
    const rows = payload?.data;
    if (!Array.isArray(rows)) throw new TypeError("invalid_notification_list");
    const identifiers = new Set();
    for (const row of rows) {
        if (
            !row ||
            typeof row.id !== "string" ||
            !row.id ||
            identifiers.has(row.id) ||
            typeof row.subject !== "string" ||
            typeof row.body !== "string" ||
            typeof row.read !== "boolean" ||
            !Number.isFinite(row.createdAt)
        ) {
            throw new TypeError("invalid_notification_record");
        }
        identifiers.add(row.id);
    }
    return rows;
}

/** Creates the provider-owned, in-memory inbox and its staged request flows. */
export function createInbox({
    ctx,
    localize,
    isActive,
    onChange,
    reportError,
}) {
    let rows = null;
    let revision = 0;
    let pending = false;
    let failed = false;
    let disposed = false;
    let reading = Promise.resolve(null);
    let settled = Promise.resolve();
    const log = ctx.capabilities.get("ui:log");
    const live = () => !disposed && !ctx.signal.aborted && isActive();
    const current = (input) =>
        live() && input.revision === revision && input.isCurrent();

    function failure(operation, outcome, status, error) {
        log?.("error", "Notification request failed.", {
            component: "notify-internal",
            operation,
            outcome,
            status,
            errorName: error?.name,
        });
    }

    ctx.registerFlow(READ_FLOW, ["request", "reconcile"]);
    ctx.extendFlow(
        READ_FLOW,
        "request",
        { id: "notify-internal:read" },
        async ({ input, data }) => {
            if (!current(input)) return;
            try {
                const response = await apiFetch(ENDPOINT, {
                    accessToken: input.token,
                });
                if (!response.ok) {
                    failure("read", "rejected", response.status);
                    return;
                }
                data.rows = validateRows(await response.json()).map(localize);
            } catch (error) {
                failure("read", "unavailable", undefined, error);
            }
        },
    );
    ctx.extendFlow(
        READ_FLOW,
        "reconcile",
        { id: "notify-internal:reconcile" },
        ({ input, data }) => {
            if (!current(input)) return;
            if (!data.rows) {
                failed = true;
                reportError(
                    input.afterMutation
                        ? "error_refresh_after_change"
                        : rows === null
                          ? "error_load"
                          : "error_refresh",
                );
                onChange();
                return;
            }
            const previous = rows;
            rows = data.rows;
            failed = false;
            data.accepted = true;
            data.previous = previous;
            onChange();
        },
    );

    const operations = {
        read: {
            method: "PUT",
            suffix: (id) => `/${encodeURIComponent(id)}/read`,
            apply: (items, id) =>
                items.map((row) =>
                    row.id === id ? { ...row, read: true } : row,
                ),
        },
        readAll: {
            method: "PUT",
            suffix: () => "/read",
            apply: (items) => items.map((row) => ({ ...row, read: true })),
        },
        dismiss: {
            method: "DELETE",
            suffix: (id) => `/${encodeURIComponent(id)}`,
            apply: (items, id) => items.filter((row) => row.id !== id),
        },
        clear: { method: "DELETE", suffix: () => "", apply: () => [] },
    };
    ctx.registerFlow(MUTATE_FLOW, ["request", "reconcile"]);
    ctx.extendFlow(
        MUTATE_FLOW,
        "request",
        { id: "notify-internal:mutate" },
        async ({ input, data }) => {
            if (!current(input)) return;
            const operation = operations[input.operation];
            try {
                const response = await apiFetch(
                    ENDPOINT + operation.suffix(input.id),
                    {
                        method: operation.method,
                        accessToken: input.token,
                    },
                );
                data.outcome = response.ok
                    ? "accepted"
                    : response.status >= 500
                      ? "uncertain"
                      : "rejected";
                if (response.ok) {
                    const receipt = (await response.json())?.data;
                    const confirmed =
                        input.operation === "clear"
                            ? Number.isSafeInteger(receipt?.removed) &&
                              receipt.removed >= 0
                            : receipt?.ok === true;
                    if (!confirmed)
                        throw new TypeError("invalid_notification_receipt");
                } else {
                    failure(input.operation, data.outcome, response.status);
                }
            } catch (error) {
                data.outcome = "uncertain";
                failure(input.operation, data.outcome, undefined, error);
            }
        },
    );
    ctx.extendFlow(
        MUTATE_FLOW,
        "reconcile",
        { id: "notify-internal:apply" },
        ({ input, data }) => {
            if (!current(input)) return;
            if (data.outcome !== "accepted") {
                failed = true;
                reportError(
                    data.outcome === "uncertain"
                        ? "error_change_uncertain"
                        : "error_change_rejected",
                );
                return;
            }
            rows = operations[input.operation].apply(rows, input.id);
            failed = false;
            data.applied = true;
            log?.("info", "Notification change acknowledged.", {
                component: "notify-internal",
                operation: input.operation,
            });
            onChange();
        },
    );

    async function read({
        isCurrent = () => true,
        afterMutation = false,
    } = {}) {
        if (!live() || pending) return null;
        const input = {
            revision: ++revision,
            isCurrent,
            afterMutation,
            token: localStorage.getItem("cognis_access_token"),
        };
        reading = ctx
            .runFlow(READ_FLOW, input)
            .then((result) =>
                current(input) && result.data.accepted
                    ? { rows, previous: result.data.previous }
                    : null,
            );
        return reading;
    }

    async function mutate(operation, id, isCurrent = () => true) {
        if (
            !live() ||
            pending ||
            failed ||
            !isCurrent() ||
            rows === null ||
            !operations[operation]
        )
            return false;
        if (id && !rows.some((row) => row.id === id)) return false;
        const input = {
            operation,
            id,
            isCurrent,
            revision: ++revision,
            token: localStorage.getItem("cognis_access_token"),
        };
        pending = true;
        let finishMutation;
        settled = new Promise((resolve) => {
            finishMutation = resolve;
        });
        onChange();
        try {
            const result = await ctx.runFlow(MUTATE_FLOW, input);
            return (
                live() &&
                input.revision === revision &&
                result.data.applied === true
            );
        } finally {
            if (input.revision === revision) {
                pending = false;
                if (live()) onChange();
            }
            finishMutation();
        }
    }

    return {
        read,
        mutate,
        get reading() {
            return reading;
        },
        get settled() {
            return settled;
        },
        get rows() {
            return rows;
        },
        get pending() {
            return pending;
        },
        get failed() {
            return failed;
        },
        reset() {
            revision++;
            rows = null;
            reading = Promise.resolve(null);
            settled = Promise.resolve();
            failed = false;
            pending = false;
            onChange();
        },
        dispose() {
            disposed = true;
            revision++;
            rows = null;
            pending = false;
        },
    };
}
