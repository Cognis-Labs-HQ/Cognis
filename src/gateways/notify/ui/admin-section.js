import { loadAdminTemplates } from "./reuse/templates.js";
import { formatTemplate } from "/static/reuse/format-template.js";
import { createAdminDraft } from "./reuse/admin-draft.js";

/**
 * Contribute notification delivery with memory-only drafts and mounted action ownership.
 * @param {{ i18n: object, apiFetch: Function, escapeHtml: Function, showToast: Function, onDirtyChange?: Function }} deps
 * @returns {object} Administration contribution with dirty, discard and subcomposer lifecycle hooks.
 */
export function createAdminSection({
    i18n,
    apiFetch,
    escapeHtml,
    showToast,
    onDirtyChange,
}) {
    const draft = createAdminDraft({
        id: "notifications",
        onDirtyChange,
        submitSelector: ".notif-debug-send",
    });
    async function loadCategories() {
        const response = await apiFetch("/api/v1/notify/categories");
        if (!response.ok) return [];
        const payload = await response.json();
        return payload.data ?? [];
    }

    async function loadUsers() {
        const response = await apiFetch("/api/v1/users");
        if (!response.ok) return [];
        const payload = await response.json();
        return payload.data ?? [];
    }

    let templates;
    let users = [];
    let categories = [];

    const dataReady = Promise.all([
        loadUsers(),
        loadCategories(),
        loadAdminTemplates(["debug"]),
    ]).then(([userRows, categoryRows, loadedTemplates]) => {
        if (!draft.active()) return;
        users = userRows;
        categories = categoryRows;
        templates = loadedTemplates;
    });

    function renderNotificationsDebugContent() {
        if (!draft.active()) return "";
        const userOptions = users
            .map((userRow) => {
                const escapedUsername = escapeHtml(userRow.username);
                return `<option value="${escapedUsername}">${escapedUsername}</option>`;
            })
            .join("");

        const categoryOptions = categories
            .map(
                (categoryRow) =>
                    `<option value="${escapeHtml(categoryRow.id)}">${escapeHtml(categoryRow.label)}</option>`,
            )
            .join("");

        const noUsers = !users.length
            ? `<p class="notif-debug-empty">${escapeHtml(i18n.t("gateway.notify.admin.debug_no_users"))}</p>`
            : "";
        const noCategories = !categories.length
            ? `<p class="notif-debug-empty">${escapeHtml(i18n.t("gateway.notify.admin.debug_no_categories"))}</p>`
            : "";

        return formatTemplate(templates.debug, {
            no_users: noUsers,
            no_categories: noCategories,
            debug_target_user_label: escapeHtml(
                i18n.t("gateway.notify.admin.debug_target_user"),
            ),
            user_options: userOptions,
            debug_category_label: escapeHtml(
                i18n.t("gateway.notify.admin.debug_category"),
            ),
            category_options: categoryOptions,
            subject_label: escapeHtml(i18n.t("ui.reuse.subject")),
            debug_subject_placeholder_label: escapeHtml(
                i18n.t("gateway.notify.admin.debug_subject_placeholder"),
            ),
            message_label: escapeHtml(i18n.t("ui.reuse.message")),
            debug_body_placeholder_label: escapeHtml(
                i18n.t("gateway.notify.admin.debug_body_placeholder"),
            ),
            debug_send_label: escapeHtml(
                i18n.t("gateway.notify.admin.debug_send"),
            ),
        });
    }

    function bindNotificationsDebug(root) {
        const panel = root.querySelector(".notif-debug-panel");
        if (!panel) return;
        const binding = draft.bind(panel);
        if (!binding) return;

        const sendButton = panel.querySelector(".notif-debug-send");
        if (!(sendButton instanceof HTMLButtonElement)) return;

        sendButton.addEventListener(
            "click",
            async () => {
                const operation = draft.begin(binding);
                if (!operation) return;
                try {
                    const userSelect =
                        panel.querySelector('[name="debugUser"]');
                    const categorySelect = panel.querySelector(
                        '[name="debugCategory"]',
                    );
                    const subjectInput = panel.querySelector(
                        '[name="debugSubject"]',
                    );
                    const bodyInput = panel.querySelector('[name="debugBody"]');

                    const recipientUsername =
                        userSelect instanceof HTMLSelectElement
                            ? userSelect.value
                            : "";
                    const category =
                        categorySelect instanceof HTMLSelectElement
                            ? categorySelect.value
                            : "";
                    const subject =
                        subjectInput instanceof HTMLInputElement
                            ? subjectInput.value.trim()
                            : "";
                    const body =
                        bodyInput instanceof HTMLTextAreaElement
                            ? bodyInput.value.trim()
                            : "";

                    if (!recipientUsername || !category || !subject || !body) {
                        showToast(
                            i18n.t("gateway.notify.admin.debug_missing_fields"),
                            {
                                variant: "warning",
                            },
                        );
                        return;
                    }

                    let response;
                    try {
                        draft.log("info", "send_started");
                        response = await apiFetch("/api/v1/notify/send", {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            signal: operation.signal,
                            body: JSON.stringify({
                                recipientUsername,
                                category,
                                subject,
                                body,
                            }),
                        });
                    } catch {
                        if (!draft.owns(operation)) return;
                        draft.log("error", "send_failed");
                        showToast(
                            i18n.t("gateway.notify.admin.debug_send_failed"),
                            { variant: "error" },
                        );
                        return;
                    }
                    if (!draft.owns(operation)) return;
                    draft.log(
                        response.ok ? "info" : "error",
                        response.ok ? "sent" : "send_failed",
                        { status: response.status },
                    );
                    if (response.ok) draft.accept(operation);
                    showToast(
                        i18n.t(
                            response.ok
                                ? "gateway.notify.admin.debug_sent"
                                : "gateway.notify.admin.debug_send_failed",
                        ),
                        { variant: response.ok ? "success" : "error" },
                    );
                } finally {
                    draft.finish(operation);
                }
            },
            { signal: binding.signal },
        );
    }

    return {
        id: "notifications",
        label: i18n.t("ui.reuse.notifications"),
        dataReady,
        isDirty: draft.isDirty,
        discard: draft.discard,
        subComposerOptions: {
            onUnmount: draft.unmount,
            allowCustomization: false,
            preferenceKey: "administration-notifications-layout",
            heading: i18n.t("ui.reuse.notifications"),
            elements: [
                {
                    id: "notifications-debug",
                    label: i18n.t("ui.reuse.debug"),
                    pinned: true,
                    render: () => renderNotificationsDebugContent(),
                },
            ],
            onRender: (rootElement) => {
                bindNotificationsDebug(rootElement);
            },
        },
    };
}
