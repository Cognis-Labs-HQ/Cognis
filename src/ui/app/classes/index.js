/**
 * Classes page — framework for per-language class management.
 *
 * For teachers: lists their assigned classes per language and provides entry
 * points to the class chat room and (future) Jitsi Meet classroom.
 *
 * For all users: provides a form to request teacher status for a language.
 * Requests are queued for admin approval.
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

    async function loadClasses() {
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

    await loadClasses();

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
                  title="${escapeHtml(i18n.t("ui.reuse.generic.coming_soon"))}"
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
              placeholder="${escapeHtml(i18n.t("module.study.classes.language_label"))}"
              maxlength="32"
            />
            <button type="button" class="btn-confirm btn-animated classes-request-btn">
              ${escapeHtml(i18n.t("module.study.classes.request_teacher"))}
            </button>
          </div>
        </div>
      `;
    }

    const classListElement = {
        id: "class-list",
        title: i18n.t("module.study.classes.page_title"),
        render() {
            const section = document.createElement("div");
            section.className = "classes-section";
            section.innerHTML = renderClassList() + renderRequestForm();

            section.addEventListener(
                "click",
                async (event) => {
                    const chatBtn = event.target.closest(".classes-chat-btn");
                    if (chatBtn) {
                        const classId = chatBtn.dataset.classId;
                        navigateTo(
                            `/messages?class=${encodeURIComponent(classId)}`,
                        );
                        return;
                    }

                    const requestBtn = event.target.closest(
                        ".classes-request-btn",
                    );
                    if (requestBtn) {
                        const input = section.querySelector(
                            ".classes-language-input",
                        );
                        const languageCode = input?.value?.trim() ?? "";
                        if (!languageCode) return;

                        try {
                            const response = await apiFetch(
                                "/api/v1/study/teacher-requests",
                                {
                                    method: "POST",
                                    headers: {
                                        "content-type": "application/json",
                                    },
                                    body: JSON.stringify({ languageCode }),
                                },
                            );
                            if (response.ok) {
                                showToast(
                                    i18n.t("module.study.classes.request_sent"),
                                    "success",
                                );
                                if (input) input.value = "";
                            } else {
                                showToast(
                                    i18n.t(
                                        "module.study.classes.request_failed",
                                    ),
                                    "error",
                                );
                            }
                        } catch {
                            showToast(
                                i18n.t("module.study.classes.request_failed"),
                                "error",
                            );
                        }
                    }
                },
                { signal },
            );

            return section;
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
