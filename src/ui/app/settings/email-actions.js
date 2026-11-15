import { captureAccountGuard } from "../../reuse/offline-identity.js";
import { showToast } from "../../reuse/toast.js";

/** Own Remove/Primary pending work and read-only recovery for one Settings mount. */
export function createEmailActions(
    root,
    { i18n, username, signal, emailClient, refresh },
) {
    const assertAccount = captureAccountGuard();
    const path = `/api/v1/notify/users/${encodeURIComponent(username)}/emails`;
    let pending = false;
    let recovery = null;
    let disposed = false;
    const log = (level, operation, details = {}) =>
        console[level]("settings:email-action", {
            component: "settings",
            operation,
            ...details,
        });

    function isCurrent(client) {
        if (disposed || signal?.aborted || root.isConnected === false)
            return false;
        if (client && emailClient() !== client) return false;
        try {
            assertAccount();
            return true;
        } catch (error) {
            disposed = true;
            log("info", "releaseEmailActions", { errorName: error.name });
            return false;
        }
    }

    function notify(key, variant) {
        showToast(i18n.t(`ui.app.settings.emails_${key}`), { variant });
    }

    function update() {
        if (!isCurrent()) return;
        const list = root.querySelector("#email-list");
        if (!list) return;
        list.setAttribute("aria-busy", String(pending));
        for (const button of list.querySelectorAll(
            "[data-remove-email],[data-set-primary]",
        )) {
            button.disabled = pending || Boolean(recovery);
        }
        let retry = list.querySelector("[data-refresh-emails]");
        if (recovery && !retry) {
            const item = list.ownerDocument.createElement("li");
            item.className = "email-list-item";
            retry = list.ownerDocument.createElement("button");
            retry.type = "button";
            retry.className = "btn-neutral btn-animated";
            retry.dataset.refreshEmails = "";
            retry.textContent = i18n.t("ui.reuse.refresh");
            item.append(retry);
            list.append(item);
        } else if (!recovery && retry) {
            retry.parentElement.remove();
            retry = null;
        }
        if (retry) retry.disabled = pending;
    }

    function observesChange(snapshot, action, address) {
        const entry = snapshot.emails.find((email) => email.email === address);
        return action === "remove" ? !entry : entry?.primary === true;
    }

    async function reconcile(client, { manual = false } = {}) {
        const outcome = recovery;
        let snapshot;
        try {
            snapshot = await refresh(() => isCurrent(client), {
                authoritative: outcome.kind !== "queued",
            });
        } catch (error) {
            if (!isCurrent(client)) return;
            log("error", "refreshEmailActions", { errorName: error?.name });
        }
        if (!isCurrent(client)) return;
        const confirmed =
            snapshot &&
            observesChange(snapshot, outcome.action, outcome.address);
        // Only queued outcomes may use Notify's projected snapshot.
        if (
            confirmed &&
            (outcome.kind === "queued" || snapshot.authoritative === true)
        ) {
            recovery = null;
            notify(
                manual
                    ? "refreshed"
                    : outcome.kind === "queued"
                      ? "queued"
                      : `${outcome.action}_completed`,
                manual || outcome.kind === "queued" ? "info" : "success",
            );
            return;
        }
        log("error", "reconcileEmailActions", {
            outcome: outcome.kind,
            source: snapshot?.source,
        });
        notify(
            outcome.kind === "accepted"
                ? "saved_refresh_failed"
                : outcome.kind === "queued"
                  ? "queued_refresh_failed"
                  : "outcome_unknown",
            "warning",
        );
    }

    async function classify(response, action) {
        if (response.status === 204) return { kind: "accepted" };
        const payload = await response.json();
        if (response.ok && payload?.queued === true) return { kind: "queued" };
        const receipt = action === "remove" ? "removed" : "updated";
        if (response.status === 200 && payload?.data?.[receipt] === true)
            return { kind: "accepted" };
        const code = payload?.error?.code;
        const protectedRemoval =
            action === "remove" &&
            response.status === 409 &&
            [
                "cannot_remove_primary_email",
                "cannot_remove_last_email",
            ].includes(code);
        if (protectedRemoval || [401, 403].includes(response.status))
            return { kind: "rejected", code };
        return { kind: "unknown" };
    }

    async function run(action, address) {
        const client = emailClient();
        if (pending || recovery || !client || !isCurrent(client)) return;
        pending = true;
        update();
        log("info", "changeEmail", { action });
        let outcome;
        try {
            try {
                const response = await client.request(
                    `${path}/${encodeURIComponent(address)}${action === "primary" ? "/primary" : ""}`,
                    { method: action === "remove" ? "DELETE" : "PUT", signal },
                );
                if (!isCurrent(client)) return;
                outcome = await classify(response, action);
            } catch (error) {
                if (!isCurrent(client)) return;
                log("error", "changeEmail", { action, errorName: error?.name });
                outcome = { kind: "unknown" };
            }
            if (!isCurrent(client)) return;
            log(
                outcome.kind === "rejected" || outcome.kind === "unknown"
                    ? "error"
                    : "info",
                "emailOutcome",
                { action, outcome: outcome.kind },
            );
            if (outcome.kind === "rejected") {
                notify(
                    outcome.code === "cannot_remove_primary_email"
                        ? "remove_primary_body"
                        : `${action}_failed`,
                    outcome.code === "cannot_remove_primary_email"
                        ? "warning"
                        : "error",
                );
                return;
            }
            recovery = { ...outcome, action, address };
            if (outcome.kind === "unknown")
                notify("outcome_unknown", "warning");
            else await reconcile(client);
        } finally {
            pending = false;
            if (isCurrent(client)) update();
        }
    }

    return {
        run,
        update,
        get busy() {
            return pending;
        },
        get blocked() {
            return Boolean(recovery);
        },
        async refresh() {
            const client = emailClient();
            if (pending || !recovery || !client || !isCurrent(client)) return;
            pending = true;
            update();
            try {
                await reconcile(client, { manual: true });
            } finally {
                pending = false;
                if (isCurrent(client)) update();
            }
        },
    };
}
