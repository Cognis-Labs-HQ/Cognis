import { uiCtx } from "../../reuse/ui-ctx.js";
import { apiFetch } from "../../reuse/api-client.js";
import { getRoleLabel, isAdminScope } from "../../reuse/access-role.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { formatDateTime } from "../../reuse/timestamp.js";

/** Creates an admin-only, page-scoped account-details reader backed by real ctx stages. */
export function createUserDetailsReader({ i18n, signal }) {
    const flowId = "users:readDetails";
    if (!uiCtx.flowExists(flowId))
        uiCtx.registerFlow(flowId, ["authorize", "load", "present"]);
    const hook = "users:accountDetails";
    const active = () => {
        signal.throwIfAborted();
        if (!isAdminScope()) throw new Error("admin_required");
    };
    uiCtx.extendFlow(flowId, "authorize", { id: hook }, active);
    uiCtx.extendFlow(flowId, "load", { id: hook }, async (stage) => {
        active();
        const accountId = stage.input.user.accountId;
        const [response, emails] = await Promise.all([
            apiFetch(`/api/v1/users/${encodeURIComponent(accountId)}/info`, {
                signal,
            }),
            uiCtx.capabilities
                .get("notify:emailClient")
                ?.listUserEmails({ accountId, signal }) ?? null,
        ]);
        if (!response.ok) throw new Error("user_metadata_unavailable");
        active();
        stage.data.info = (await response.json())?.data;
        stage.data.emails = emails;
    });
    uiCtx.extendFlow(flowId, "present", { id: hook }, (stage) => {
        active();
        const info = { ...stage.input.user, ...stage.data.info };
        const yesNo = (value) => i18n.t(value ? "ui.reuse.yes" : "ui.reuse.no");
        const unknown = i18n.t("ui.reuse.unknown");
        const fields = [
            ["ui.app.users.username", info.username],
            ["ui.reuse.account_id", info.accountId],
            [
                "ui.reuse.authentication_provider",
                info.providerLabel ?? info.provider,
            ],
            [
                "ui.app.users.role",
                info.role ? getRoleLabel(i18n, info.role) : unknown,
            ],
            ["ui.app.users.founder", yesNo(info.isFounder)],
            [
                "ui.app.users.status",
                i18n.t(
                    info.enabled
                        ? "ui.app.users.enabled"
                        : "ui.app.users.disabled",
                ),
            ],
            [
                "ui.app.users.member_since",
                formatDateTime(info.createdAt, unknown),
            ],
            [
                "ui.app.users.last_login",
                formatDateTime(info.lastLogin, unknown),
            ],
        ];
        const emails =
            stage.data.emails
                ?.map(
                    (email) =>
                        `<div class="users-email-row"><span>${escapeHtml(email.email)}</span><span class="users-email-badges">${email.primary ? `<span class="state-pill pill-available">${escapeHtml(i18n.t("ui.app.settings.emails_primary"))}</span>` : ""}<span class="state-pill ${email.verified ? "pill-active" : "pill-disabled"}">${escapeHtml(i18n.t(email.verified ? "ui.app.settings.emails_verified" : "ui.app.settings.emails_unverified"))}</span></span></div>`,
                )
                .join("") ?? escapeHtml(unknown);
        return `<dl class="users-details-grid">${fields.map(([key, value]) => `<div class="users-detail-field"><dt>${escapeHtml(i18n.t(key))}</dt><dd>${escapeHtml(value ?? unknown)}</dd></div>`).join("")}<div class="users-detail-field users-detail-emails"><dt>${escapeHtml(i18n.t("ui.app.settings.emails"))}</dt><dd class="users-email-list">${emails || escapeHtml(i18n.t("ui.app.settings.emails_none"))}</dd></div></dl>`;
    });
    signal.addEventListener(
        "abort",
        () => {
            for (const stage of ["authorize", "load", "present"])
                uiCtx.removeFlowHook(flowId, stage, hook);
        },
        { once: true },
    );
    return async (user) => {
        active();
        const result = await uiCtx.runFlow(flowId, { user });
        active();
        return result.stageResults.present[0];
    };
}
