/** Files gateway namespace quota administration contribution. */

import {
    loadNamespaceQuotaDefaults,
    updateGlobalQuotaDefault,
    updateNamespaceQuotaDefault,
} from "./client.js";

export function createAdminSection({ i18n, apiFetch, escapeHtml, showToast }) {
    let model = { namespaces: [], globalDefault: 0 };
    const dataReady = loadNamespaceQuotaDefaults(apiFetch).then((data) => {
        model = data;
    });

    const input = (name, value) =>
        `<input name="${escapeHtml(name)}" type="number" min="1" step="1" required value="${escapeHtml(value)}">`;

    function renderContent() {
        const namespaces = model.namespaces
            .map(
                (namespace) => `<tr>
                    <td><code>${escapeHtml(namespace.namespaceId)}</code></td>
                    <td>${escapeHtml(namespace.ownerComponent)}</td>
                    <td>${escapeHtml(namespace.visibility)}</td>
                    <td>${input(`namespace:${namespace.namespaceId}`, namespace.quotaBytes)}</td>
                    <td><button class="btn-confirm btn-animated" type="button" data-files-save-namespace="${escapeHtml(namespace.namespaceId)}">${escapeHtml(i18n.t("gateway.files.admin.save"))}</button></td>
                </tr>`,
            )
            .join("");
        return `<div data-files-quota-admin>
            <p>${escapeHtml(i18n.t("gateway.files.admin.description"))}</p>
            <label>${escapeHtml(i18n.t("gateway.files.admin.global_default"))} ${input("global", model.globalDefault)}</label>
            <button class="btn-confirm btn-animated" type="button" data-files-save-global>${escapeHtml(i18n.t("gateway.files.admin.save"))}</button>
            <div class="users-table-wrap"><table class="users-table"><thead><tr>
                <th>${escapeHtml(i18n.t("gateway.files.admin.namespace"))}</th>
                <th>${escapeHtml(i18n.t("gateway.files.admin.owner"))}</th>
                <th>${escapeHtml(i18n.t("gateway.files.admin.visibility"))}</th>
                <th>${escapeHtml(i18n.t("gateway.files.admin.quota_bytes"))}</th>
                <th>${escapeHtml(i18n.t("ui.reuse.actions"))}</th>
            </tr></thead><tbody>${namespaces}</tbody></table></div>
        </div>`;
    }

    function quotaValue(root, name) {
        const value = Number(
            root.querySelector(`[name="${CSS.escape(name)}"]`)?.value,
        );
        if (!Number.isSafeInteger(value) || value <= 0)
            throw new Error("invalid_quota");
        return value;
    }

    function onRender(root) {
        const panel = root.querySelector("[data-files-quota-admin]");
        if (!panel) return;
        panel
            .querySelector("[data-files-save-global]")
            ?.addEventListener("click", async () => {
                try {
                    model.globalDefault = quotaValue(panel, "global");
                    await updateGlobalQuotaDefault(
                        apiFetch,
                        model.globalDefault,
                    );
                    showToast(i18n.t("gateway.files.admin.saved"), {
                        type: "success",
                    });
                } catch {
                    showToast(i18n.t("gateway.files.admin.save_failed"), {
                        type: "error",
                    });
                }
            });
        panel
            .querySelectorAll("[data-files-save-namespace]")
            .forEach((button) => {
                button.addEventListener("click", async () => {
                    const namespaceId = button.dataset.filesSaveNamespace;
                    try {
                        const quotaBytes = quotaValue(
                            panel,
                            `namespace:${namespaceId}`,
                        );
                        await updateNamespaceQuotaDefault(
                            apiFetch,
                            namespaceId,
                            quotaBytes,
                        );
                        const namespace = model.namespaces.find(
                            (item) => item.namespaceId === namespaceId,
                        );
                        if (namespace) namespace.quotaBytes = quotaBytes;
                        showToast(i18n.t("gateway.files.admin.saved"), {
                            type: "success",
                        });
                    } catch {
                        showToast(i18n.t("gateway.files.admin.save_failed"), {
                            type: "error",
                        });
                    }
                });
            });
    }

    return {
        id: "file-namespace-quotas",
        label: i18n.t("gateway.files.admin.title"),
        dataReady,
        subComposerOptions: {
            allowCustomization: false,
            preferenceKey: "administration-file-namespace-quotas-layout",
            heading: i18n.t("gateway.files.admin.title"),
            elements: [
                {
                    id: "defaults",
                    label: i18n.t("gateway.files.admin.title"),
                    pinned: true,
                    render: renderContent,
                },
            ],
            onRender,
        },
    };
}
