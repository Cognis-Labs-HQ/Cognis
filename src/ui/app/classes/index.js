/**
 * Classes page — framework for per-language class management.
 *
 * For teachers: lists their assigned classes per language and provides entry
 * points to the class chat room and (future) Jitsi Meet classroom.
 *
 * For all users: provides a form to request teacher status for a language.
 * Requests are queued for admin approval when manual approval is enabled.
 *
 * @module app/classes
 */

import { apiFetch } from "../../reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer.js";
import { showToast } from "../../reuse/toast.js";
import { openPopup } from "../../reuse/popup.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { navigateTo } from "../../reuse/app-router.js";

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n();
    applyDocumentTitle(i18n, "module.study.classes.page_title");

    let classes = [];
    let pendingRequests = [];
    let storedRole = (localStorage.getItem("cognis_role") ?? "").trim();
    const isAdminRole = () => storedRole === "admin" || storedRole === "owner";
    const isTeacherRole = () => storedRole === "teacher";
    let isTeacher = isTeacherRole();

    if (!isTeacher) {
        try {
            const accountId = localStorage.getItem("cognis_account");
            if (accountId) {
                const response = await apiFetch(
                    `/api/v1/users/${encodeURIComponent(accountId)}/info`,
                );
                if (response.ok) {
                    const payload = await response.json();
                    storedRole = String(payload?.data?.role ?? "").trim();
                    localStorage.setItem("cognis_role", storedRole);
                    isTeacher = isTeacherRole();
                }
            }
        } catch {
            isTeacher = false;
        }
    }

    if (!isTeacher) {
        navigateTo("/dashboard");
        return;
    }

    async function loadClasses() {
        if (!isTeacher) return;
        try {
            const response = await apiFetch("/api/v1/study/classes");
            if (response.ok) {
                const payload = await response.json();
                classes = payload?.data ?? [];
            }
        } catch {
            classes = [];
        }
    }

    async function loadPendingRequests() {
        if (!isAdminRole()) return;
        try {
            const response = await apiFetch("/api/v1/study/teacher-requests");
            if (response.ok) {
                const payload = await response.json();
                pendingRequests = payload?.data ?? [];
            }
        } catch {
            pendingRequests = [];
        }
    }

    await Promise.all([loadClasses(), loadPendingRequests()]);

    function renderClassList() {
        if (!classes.length) {
            return `<p class="classes-empty">${escapeHtml(i18n.t("module.study.classes.empty"))}</p>`;
        }
        return `
        <ul class="classes-list">
          ${classes
              .map(
                  (cls) => `
            <li class="classes-item">
              <span class="classes-language">${escapeHtml(cls.languageCode)}</span>
              <div class="classes-actions">
                <button
                  type="button"
                  class="btn-confirm btn-animated classes-chat-btn"
                  data-class-id="${escapeHtml(cls.id)}"
                >${escapeHtml(i18n.t("module.study.classes.open_chat"))}</button>
                <button
                  type="button"
                  class="classes-meeting-btn"
                  data-class-id="${escapeHtml(cls.id)}"
                  disabled
                  title="${escapeHtml(i18n.t("ui.reuse.coming_soon"))}"
                >${escapeHtml(i18n.t("module.study.classes.open_meeting"))}</button>
              </div>
            </li>
          `,
              )
              .join("")}
        </ul>
      `;
    }

    function renderRequestForm() {
        return `
        <div class="classes-request-form">
          <h3 class="classes-section-heading">${escapeHtml(i18n.t("module.study.classes.request_teacher"))}</h3>
          <div class="classes-request-row">
            <input
              type="text"
              class="classes-language-input"
              placeholder="${escapeHtml(i18n.t("ui.reuse.language"))}"
              maxlength="32"
            />
            <button type="button" class="btn-confirm btn-animated classes-request-btn">
              ${escapeHtml(i18n.t("module.study.classes.request_teacher"))}
            </button>
          </div>
        </div>
      `;
    }

    function renderPendingRequests() {
        if (!isAdminRole()) return "";
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
                <h3 class="classes-section-heading">${escapeHtml(i18n.t("module.study.classes.pending_requests"))}</h3>
                <ul class="classes-list">${rows}</ul>
            </div>
        `;
    }

    async function askTeacherReason() {
        let reason = "";
        const action = await openPopup({
            title: i18n.t("module.study.classes.teacher_application_title"),
            body: `
                <label class="stack">
                    ${escapeHtml(i18n.t("module.study.classes.teacher_application_reason"))}
                    <textarea id="classes-teacher-reason" class="theme-select" rows="5"></textarea>
                </label>
            `,
            variant: "confirm",
            actions: [
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
                {
                    id: "submit",
                    label: i18n.t("module.study.classes.submit_application"),
                    variant: "confirm",
                },
            ],
            onAction: (actionId, overlay) => {
                if (actionId !== "submit") return true;
                const input = overlay.querySelector("#classes-teacher-reason");
                reason = input?.value?.trim() ?? "";
                return true;
            },
        });
        return action === "submit" ? reason : null;
    }

    const classListElement = {
        id: "class-list",
        title: i18n.t("module.study.classes.page_title"),
        render() {
            return `<div class="classes-section">${
                (isTeacher ? renderClassList() : "") +
                renderRequestForm() +
                renderPendingRequests()
            }</div>`;
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
                    const chatButton =
                        event.target.closest(".classes-chat-btn");
                    if (chatButton) {
                        const classId = chatButton.dataset.classId;
                        navigateTo(
                            `/messages?class=${encodeURIComponent(classId)}`,
                        );
                        return;
                    }

                    const reviewButton = event.target.closest(
                        ".classes-review-btn",
                    );
                    if (reviewButton) {
                        const requestId = reviewButton.dataset.requestId;
                        const action = reviewButton.dataset.action;
                        const response = await apiFetch(
                            `/api/v1/study/teacher-requests/${encodeURIComponent(requestId)}/${action}`,
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
                        if (response.ok) {
                            await loadPendingRequests();
                            section.innerHTML =
                                (isTeacher ? renderClassList() : "") +
                                renderRequestForm() +
                                renderPendingRequests();
                        }
                        return;
                    }

                    const requestButton = event.target.closest(
                        ".classes-request-btn",
                    );
                    if (!requestButton) return;
                    const languageInput = section.querySelector(
                        ".classes-language-input",
                    );
                    const languageCode = languageInput?.value?.trim() ?? "";
                    if (!languageCode) return;
                    const reason = await askTeacherReason();
                    if (reason === null) return;

                    try {
                        const response = await apiFetch(
                            "/api/v1/study/teacher-requests",
                            {
                                method: "POST",
                                headers: {
                                    "content-type": "application/json",
                                },
                                body: JSON.stringify({
                                    languageCode,
                                    reason,
                                }),
                            },
                        );
                        if (response.ok) {
                            showToast(
                                i18n.t("module.study.classes.request_sent"),
                                { variant: "success" },
                            );
                            if (languageInput) languageInput.value = "";
                        } else {
                            showToast(
                                i18n.t("module.study.classes.request_failed"),
                                { variant: "error" },
                            );
                        }
                    } catch {
                        showToast(
                            i18n.t("module.study.classes.request_failed"),
                            {
                                variant: "error",
                            },
                        );
                    }
                },
                { signal },
            );
        },
        gridSize: { default: [6, 4], min: [2, 2], max: "full" },
    };

    const composer = createPageComposer(root, {
        allowCustomization: false,
        elements: [classListElement],
        preferenceKey: "classes-layout",
        i18n,
        pageContext: {
            title: i18n.t("module.study.classes.page_title"),
        },
    });

    await composer.init();
}

if (!globalThis.__spaRouter) await mount(document.querySelector("#app"));
