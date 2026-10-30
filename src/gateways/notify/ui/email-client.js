import { apiFetch } from "/static/reuse/api-client.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { isOffline } from "/static/reuse/offline-state.js";
import { bindOfflineSnapshotRefresh } from "/static/reuse/offline-snapshot.js";
import { registerOfflineHttpClient } from "/static/reuse/offline-http-client.js";
import { loadTrustedDomains } from "/static/reuse/trusted-domains.js";
import { captureAccountGuard } from "/static/reuse/offline-identity.js";
import { isSmtpAdapterActive } from "./smtp-adapter.js";

function emailRoot() {
    return `/api/v1/notify/users/${encodeURIComponent(localStorage.getItem("cognis_account") ?? "")}/emails`;
}

function describeEmailRequest(path, method) {
    const root = emailRoot();
    if (path === root && method === "GET") return {};
    if (path === root && method === "POST") return { write: true };
    const relative = path.startsWith(root + "/")
        ? path.slice(root.length + 1)
        : "";
    if (/^[^/?]+$/.test(relative) && method === "DELETE")
        return { write: true };
    if (/^[^/?]+\/primary$/.test(relative) && method === "PUT")
        return { write: true };
    return null;
}

/** Own email snapshots and pending changes; verification remains an online server action. */
export function mountProvider(ctx) {
    let domains;
    const request = registerOfflineHttpClient(ctx, {
        owner: "notify.emails",
        request: async (path, options = {}) => {
            const assertAccount = captureAccountGuard();
            const response = await apiFetch(path, options);
            assertAccount();
            if (
                options.method &&
                options.method !== "GET" &&
                response.ok &&
                !isOffline()
            ) {
                try {
                    await request(emailRoot());
                } catch (error) {
                    console.error("[notify] email snapshot refresh failed", {
                        operation: "refreshEmailSnapshot",
                        errorName: error.name,
                    });
                }
            }
            return response;
        },
        describe: describeEmailRequest,
        project(path, payload, pending) {
            if (path !== emailRoot() || !Array.isArray(payload.data))
                return payload;
            for (const { payload: operation } of pending) {
                if (operation.path === path && operation.method === "POST") {
                    const email = operation.body.email;
                    if (!payload.data.some((entry) => entry.email === email))
                        payload.data.push({
                            email,
                            verified: false,
                            primary: payload.data.length === 0,
                            queued: true,
                        });
                } else if (operation.path.startsWith(path + "/")) {
                    const relative = operation.path.slice(path.length + 1);
                    const email = decodeURIComponent(relative.split("/")[0]);
                    if (operation.method === "DELETE")
                        payload.data = payload.data.filter(
                            (entry) => entry.email !== email,
                        );
                    if (
                        operation.method === "PUT" &&
                        relative.endsWith("/primary")
                    )
                        for (const entry of payload.data)
                            entry.primary = entry.email === email;
                }
            }
            return payload;
        },
    });
    const registerActions = ctx.capabilities.get("ui:scopedActions");
    if (!registerActions) throw new Error("email_client_unavailable");
    const actions = registerActions(ctx, "notify:emailPolicy", {
        listUserEmails: ({ accountId, signal }) =>
            loadUserEmails(accountId, { signal }),
        smtpAvailable: () => isSmtpAdapterActive(apiFetch),
        resendUserEmail: ({ accountId, email }) => {
            if (isOffline()) throw new Error("offline_operation_unavailable");
            return apiFetch(
                `/api/v1/notify/users/${encodeURIComponent(accountId)}/emails/${encodeURIComponent(email)}/resend`,
                {
                    method: "POST",
                    signal: ctx.signal,
                },
            );
        },
        trustedDomains: async () => {
            const assertAccount = captureAccountGuard();
            if (!isOffline())
                domains = {
                    account: localStorage.getItem("cognis_account"),
                    values: await loadTrustedDomains(apiFetch),
                };
            assertAccount();
            if (domains?.account !== localStorage.getItem("cognis_account"))
                throw new Error("offline_read_unavailable");
            return domains.values;
        },
    });
    ctx.capabilities.contribute("notify:emailClient", {
        ...actions,
        async request(path, options = {}) {
            if (path !== emailRoot() && !path.startsWith(emailRoot() + "/"))
                throw new Error("email_account_mismatch");
            if (
                isOffline() &&
                !describeEmailRequest(
                    path,
                    (options.method ?? "GET").toUpperCase(),
                )
            )
                throw new Error("offline_operation_unavailable");
            return request(path, options);
        },
    });
    bindOfflineSnapshotRefresh(ctx, {
        id: "notify:prepareEmailSettings",
        refresh: () =>
            Promise.all([request(emailRoot()), actions.trustedDomains()]),
    });
}

/** Resolve the owning provider across bundled and directly served loaders. */
export function emailRequest(path, options) {
    const client = uiCtx.capabilities.get("notify:emailClient");
    if (!client) throw new Error("email_client_unavailable");
    return client.request(path, options);
}

export function emailTrustedDomains() {
    const client = uiCtx.capabilities.get("notify:emailClient");
    if (!client) throw new Error("email_client_unavailable");
    return client.trustedDomains();
}

/** Read administrator-authorized metadata; other-account reads are never cached. */
export async function loadUserEmails(accountId, { signal } = {}) {
    const assertAccount = captureAccountGuard();
    const response = await apiFetch(
        `/api/v1/notify/users/${encodeURIComponent(accountId)}/emails`,
        { signal },
    );
    if (!response.ok) throw new Error("user_email_metadata_unavailable");
    const payload = await response.json();
    assertAccount();
    return Array.isArray(payload?.data) ? payload.data : [];
}
