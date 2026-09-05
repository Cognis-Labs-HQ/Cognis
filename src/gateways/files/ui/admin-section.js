import { openPopup } from "/static/reuse/popup.js";

export function createAdminSection({ i18n, apiFetch, escapeHtml, showToast }) {
    let users = [];
    const dataReady = apiFetch("/api/v1/users").then(async (response) => {
        const payload = await response.json();
        users = Array.isArray(payload.data)
            ? payload.data
            : (payload.data?.users ?? []);
    });
    return {
        id: "files",
        label: i18n.t("gateway.files.admin.title"),
        dataReady,
        subComposerOptions: {
            pageContext: {
                title: i18n.t("gateway.files.admin.title"),
                subtitle: i18n.t("gateway.files.admin.subtitle"),
            },
            elements: [
                {
                    id: "file-provider-defaults",
                    label: i18n.t("gateway.files.admin.providers"),
                    render: () =>
                        `<section><label>${escapeHtml(i18n.t("gateway.files.admin.default_provider"))}<select class="theme-select" id="files-default-provider"><option value="local">Local</option></select></label><table><thead><tr><th>${escapeHtml(i18n.t("gateway.files.admin.user"))}</th><th>${escapeHtml(i18n.t("gateway.files.admin.provider"))}</th></tr></thead><tbody>${users.map((user) => `<tr><td>${escapeHtml(user.username ?? user.id ?? "")}</td><td><select class="theme-select files-user-provider" data-user="${escapeHtml(user.username ?? user.id ?? "")}"><option value="local">Local</option></select></td></tr>`).join("")}</tbody></table><button type="button" class="btn-neutral" id="files-quota-settings">${escapeHtml(i18n.t("gateway.files.admin.quotas"))}</button></section>`,
                },
            ],
            onRender: (element) => {
                element
                    .querySelectorAll(".files-user-provider")
                    .forEach((select) =>
                        select.addEventListener("change", async () => {
                            const response = await apiFetch(
                                `/api/v1/files/library/admin/users/${encodeURIComponent(select.dataset.user)}/provider`,
                                {
                                    method: "PUT",
                                    headers: {
                                        "content-type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        providerId: select.value,
                                    }),
                                },
                            );
                            showToast(
                                response.ok
                                    ? i18n.t("gateway.files.admin.saved")
                                    : i18n.t("gateway.files.admin.failed"),
                            );
                        }),
                    );
                element
                    .querySelector("#files-quota-settings")
                    ?.addEventListener("click", async () => {
                        const response = await apiFetch(
                            "/api/v1/files/admin/namespace-defaults",
                        );
                        const payload = await response.json();
                        const rows = payload.data?.namespaces ?? [];
                        await openPopup({
                            title: i18n.t("gateway.files.admin.quotas"),
                            body: `<p>${escapeHtml(i18n.t("gateway.files.admin.quota_pool"))}</p><table><tbody><tr><th>Global</th><td>${Number(payload.data?.globalDefault ?? 0)} B</td></tr>${rows.map((row) => `<tr><th>${escapeHtml(row.namespaceId)}</th><td>${Number(row.quotaBytes ?? 0)} B</td></tr>`).join("")}</tbody></table>`,
                            actions: [
                                {
                                    id: "close",
                                    label: i18n.t("ui.reuse.close"),
                                    variant: "neutral",
                                },
                            ],
                        });
                    });
            },
        },
    };
}
