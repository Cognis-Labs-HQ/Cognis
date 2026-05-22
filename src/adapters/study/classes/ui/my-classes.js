/**
 * My Classes page — student view for class enrollment management.
 *
 * Students can view enrolled classes, leave classes, and browse and request
 * to join available classes with optional language filtering.
 *
 * Public exports:
 *   mount(root, options) — mounts the page into the given root element.
 *
 * @module app/my-classes
 */

import { apiFetch } from "/static/reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/init.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { navigateTo } from "/static/reuse/app-router.js";

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n();
    applyDocumentTitle(i18n, "module.study.classes.my_classes_page_title");

    let enrolledClasses = [];
    let availableClasses = [];
    let selectedLanguageFilter = "";

    async function loadEnrolled() {
        try {
            const response = await apiFetch("/api/v1/study/my-classes");
            if (response.ok) {
                const payload = await response.json();
                enrolledClasses = payload?.data ?? [];
            } else {
                enrolledClasses = [];
            }
        } catch {
            enrolledClasses = [];
        }
    }

    async function loadAvailable() {
        try {
            const languageParam = selectedLanguageFilter
                ? `?language=${encodeURIComponent(selectedLanguageFilter)}`
                : "";
            const response = await apiFetch(
                `/api/v1/study/available-classes${languageParam}`,
            );
            if (response.ok) {
                const payload = await response.json();
                availableClasses = payload?.data ?? [];
            } else {
                availableClasses = [];
            }
        } catch {
            availableClasses = [];
        }
    }

    await Promise.all([loadEnrolled(), loadAvailable()]);

    function buildLanguageOptions() {
        const languages = [
            ...new Set(availableClasses.map((cls) => cls.languageCode)),
        ].sort();
        return languages;
    }

    function renderEnrolledSection() {
        if (!enrolledClasses.length) {
            return `<p class="classes-empty">${escapeHtml(i18n.t("module.study.classes.no_enrolled_classes"))}</p>`;
        }
        const items = enrolledClasses
            .map(
                (cls) => `
          <li class="classes-item">
            <span class="classes-language">${escapeHtml(cls.languageCode)}</span>
            <span class="classes-member-count">
              ${escapeHtml(i18n.t("module.study.classes.teacher"))}: ${escapeHtml(cls.teacherAccountId)}
            </span>
            <div class="classes-actions">
              <button
                type="button"
                class="btn-cancel btn-animated classes-leave-btn"
                data-class-id="${escapeHtml(cls.id)}"
              >${escapeHtml(i18n.t("module.study.classes.leave_class"))}</button>
            </div>
          </li>
        `,
            )
            .join("");
        return `<ul class="classes-list">${items}</ul>`;
    }

    function renderLanguageFilter(languages) {
        const allPill = `
          <button
            type="button"
            class="classes-filter-pill${selectedLanguageFilter === "" ? " active" : ""}"
            data-language=""
          >${escapeHtml(i18n.t("module.study.classes.all_languages"))}</button>
        `;
        const languagePills = languages
            .map(
                (language) => `
          <button
            type="button"
            class="classes-filter-pill${selectedLanguageFilter === language ? " active" : ""}"
            data-language="${escapeHtml(language)}"
          >${escapeHtml(language)}</button>
        `,
            )
            .join("");
        return `<div class="classes-filter-row">${allPill}${languagePills}</div>`;
    }

    function renderAvailableSection(languages) {
        const filterRow = renderLanguageFilter(languages);
        if (!availableClasses.length) {
            return `
              ${filterRow}
              <p class="classes-empty">${escapeHtml(i18n.t("module.study.classes.no_available_classes"))}</p>
            `;
        }
        const items = availableClasses
            .map(
                (cls) => `
          <li class="classes-item">
            <span class="classes-language">${escapeHtml(cls.languageCode)}</span>
            <span class="classes-member-count">
              ${escapeHtml(i18n.t("module.study.classes.teacher"))}: ${escapeHtml(cls.teacherAccountId)}
            </span>
            <div class="classes-actions">
              <button
                type="button"
                class="btn-confirm btn-animated classes-join-btn"
                data-class-id="${escapeHtml(cls.id)}"
              >${escapeHtml(i18n.t("module.study.classes.join_request"))}</button>
            </div>
          </li>
        `,
            )
            .join("");
        return `${filterRow}<ul class="classes-list">${items}</ul>`;
    }

    const myClassesElement = {
        id: "my-classes",
        title: i18n.t("module.study.classes.my_classes_page_title"),
        render() {
            const languages = buildLanguageOptions();
            return `
              <div class="classes-section">
                <div class="classes-request-form">
                  <h3 class="classes-section-heading">${escapeHtml(i18n.t("module.study.classes.enrolled_classes"))}</h3>
                  <div class="classes-enrolled-content">
                    ${renderEnrolledSection()}
                  </div>
                </div>
                <div class="classes-request-form">
                  <h3 class="classes-section-heading">${escapeHtml(i18n.t("module.study.classes.available_classes"))}</h3>
                  <div class="classes-available-content">
                    ${renderAvailableSection(languages)}
                  </div>
                </div>
              </div>
            `;
        },
        onRender() {
            const section = root.querySelector(".classes-section");
            if (!(section instanceof HTMLElement)) return;
            if (section.dataset.bound === "true") return;
            section.dataset.bound = "true";

            function refreshContent() {
                const languages = buildLanguageOptions();
                const enrolledContent = section.querySelector(
                    ".classes-enrolled-content",
                );
                const availableContent = section.querySelector(
                    ".classes-available-content",
                );
                if (enrolledContent instanceof HTMLElement) {
                    enrolledContent.innerHTML = renderEnrolledSection();
                }
                if (availableContent instanceof HTMLElement) {
                    availableContent.innerHTML =
                        renderAvailableSection(languages);
                }
            }

            section.addEventListener(
                "click",
                async (event) => {
                    if (!(event.target instanceof Element)) return;

                    const filterPill = event.target.closest(
                        ".classes-filter-pill",
                    );
                    if (filterPill instanceof HTMLElement) {
                        selectedLanguageFilter =
                            filterPill.dataset.language ?? "";
                        await loadAvailable();
                        refreshContent();
                        return;
                    }

                    const leaveButton =
                        event.target.closest(".classes-leave-btn");
                    if (leaveButton instanceof HTMLElement) {
                        const classId = leaveButton.dataset.classId ?? "";
                        const confirmed = await openPopup({
                            title: i18n.t(
                                "module.study.classes.leave_confirm_title",
                            ),
                            body: `<p>${escapeHtml(i18n.t("module.study.classes.leave_confirm_body"))}</p>`,
                            variant: "confirm",
                            actions: [
                                {
                                    id: "cancel",
                                    label: i18n.t("ui.reuse.cancel"),
                                    variant: "cancel",
                                },
                                {
                                    id: "confirm",
                                    label: i18n.t(
                                        "module.study.classes.leave_class",
                                    ),
                                    variant: "confirm",
                                },
                            ],
                        });
                        if (confirmed !== "confirm") return;
                        try {
                            const response = await apiFetch(
                                `/api/v1/study/classes/${encodeURIComponent(classId)}/membership`,
                                { method: "DELETE" },
                            );
                            if (response.ok) {
                                showToast(
                                    i18n.t(
                                        "module.study.classes.leave_success",
                                    ),
                                    { variant: "success" },
                                );
                                await Promise.allSettled([
                                    loadEnrolled(),
                                    loadAvailable(),
                                ]);
                                refreshContent();
                            } else {
                                showToast(
                                    i18n.t("module.study.classes.leave_failed"),
                                    { variant: "error" },
                                );
                            }
                        } catch {
                            showToast(
                                i18n.t("module.study.classes.leave_failed"),
                                { variant: "error" },
                            );
                        }
                        return;
                    }

                    const joinButton =
                        event.target.closest(".classes-join-btn");
                    if (joinButton instanceof HTMLElement) {
                        const classId = joinButton.dataset.classId ?? "";
                        joinButton.disabled = true;
                        try {
                            const response = await apiFetch(
                                `/api/v1/study/classes/${encodeURIComponent(classId)}/join`,
                                { method: "POST" },
                            );
                            if (response.ok) {
                                showToast(
                                    i18n.t("module.study.classes.join_sent"),
                                    { variant: "success" },
                                );
                                await loadAvailable();
                                refreshContent();
                            } else {
                                showToast(
                                    i18n.t("module.study.classes.join_failed"),
                                    { variant: "error" },
                                );
                                joinButton.disabled = false;
                            }
                        } catch {
                            showToast(
                                i18n.t("module.study.classes.join_failed"),
                                { variant: "error" },
                            );
                            joinButton.disabled = false;
                        }
                        return;
                    }
                },
                { signal },
            );
        },
        gridSize: { default: [6, 4], min: [2, 2], max: "full" },
    };

    const composer = createPageComposer(root, {
        allowCustomization: false,
        elements: [myClassesElement],
        preferenceKey: "my-classes-layout",
        i18n,
        pageContext: {
            title: i18n.t("module.study.classes.my_classes_page_title"),
            subtitle: i18n.t("module.study.classes.my_classes_page_subtitle"),
        },
    });

    await composer.init();
}

if (!globalThis.__spaRouter) {
    try {
        await mount(document.querySelector("#app"));
    } catch (error) {
        console.error("[study-classes] my-classes mount failed", error);
    }
}
