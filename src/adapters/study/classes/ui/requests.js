import { apiFetch } from "/static/reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { showToast } from "/static/reuse/toast.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { isAdminScope } from "/static/reuse/access-role.js";
import { navigateTo } from "/static/reuse/app-router.js";

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n();
    applyDocumentTitle(i18n, "module.study.classes.requests_page_title");

    if (!isAdminScope()) {
        navigateTo("/dashboard");
        return;
    }

    let pendingRequests = [];

    async function loadPendingRequests() {
        try {
            const response = await apiFetch("/api/v1/study/teacher-requests");
            if (!response.ok) {
                pendingRequests = [];
                return;
            }
            const payload = await response.json();
            pendingRequests = payload?.data ?? [];
        } catch {
            pendingRequests = [];
        }
    }

    await loadPendingRequests();

    function renderTeacherRequests() {
        const rows = pendingRequests.length
            ? pendingRequests
                  .map(
                      (request) => `
                <li class="classes-item">
                    <span class="classes-language">${escapeHtml(request.accountId)} · ${escapeHtml(request.languageCode)}</span>
                    ${request.reason ? `<p class="classes-request-reason">${escapeHtml(request.reason)}</p>` : ""}
                    <div class="classes-actions">
                        <button type="button" class="btn-confirm btn-animated classes-review-btn" data-request-id="${escapeHtml(request.id)}" data-action="approve">${escapeHtml(i18n.t("module.study.classes.approve"))}</button>
                        <button type="button" class="btn-cancel btn-animated classes-review-btn" data-request-id="${escapeHtml(request.id)}" data-action="reject">${escapeHtml(i18n.t("module.study.classes.reject"))}</button>
                    </div>
                </li>
            `,
                  )
                  .join("")
            : `<p class="classes-empty">${escapeHtml(i18n.t("module.study.classes.no_pending_requests"))}</p>`;
        return `
            <div class="classes-request-form">
                <h3 class="classes-section-heading">${escapeHtml(i18n.t("module.study.classes.teacher_requests_section_title"))}</h3>
                <ul class="classes-list">${rows}</ul>
            </div>
        `;
    }

    const requestsElement = {
        id: "study-requests-list",
        title: i18n.t("module.study.classes.requests_page_title"),
        render() {
            return `<div class="classes-section">${renderTeacherRequests()}</div>`;
        },
        onRender() {
            const section = root.querySelector(".classes-section");
            if (!(section instanceof HTMLElement)) return;
            if (section.dataset.bound === "true") return;
            section.dataset.bound = "true";
            section.addEventListener(
                "click",
                async (event) => {
                    if (!(event.target instanceof Element)) return;
                    const reviewButton = event.target.closest(
                        ".classes-review-btn",
                    );
                    if (!(reviewButton instanceof HTMLElement)) return;
                    const requestId = reviewButton.dataset.requestId ?? "";
                    const reviewAction = reviewButton.dataset.action ?? "";
                    const response = await apiFetch(
                        `/api/v1/study/teacher-requests/${encodeURIComponent(requestId)}/${reviewAction}`,
                        { method: "POST" },
                    );
                    showToast(
                        i18n.t(
                            response.ok
                                ? "module.study.classes.review_saved"
                                : "module.study.classes.review_failed",
                        ),
                        { variant: response.ok ? "success" : "error" },
                    );
                    if (!response.ok) return;
                    await loadPendingRequests();
                    section.innerHTML = renderTeacherRequests();
                },
                { signal },
            );
        },
        gridSize: { default: [6, 4], min: [2, 2], max: "full" },
    };

    const composer = createPageComposer(root, {
        allowCustomization: false,
        elements: [requestsElement],
        preferenceKey: "study-requests-layout",
        i18n,
        pageContext: {
            title: i18n.t("module.study.classes.requests_page_title"),
            subtitle: i18n.t("module.study.classes.requests_page_subtitle"),
        },
    });

    await composer.init();
}

await mountWhenDirect(mount).catch((error) => {
    console.error("[study-classes] requests mount failed", error);
});
