import { apiFetch } from "../../reuse/api-client.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { openPopup } from "../../reuse/popup.js";
import { showToast } from "../../reuse/toast.js";

function normalizeList(values) {
    return [...new Set((values ?? []).filter(Boolean).map(String))];
}

function listsEqual(a, b) {
    const left = normalizeList(a).sort();
    const right = normalizeList(b).sort();
    return (
        left.length === right.length &&
        left.every((value, i) => value === right[i])
    );
}

export function initStudyPrefs(root, { i18n, onDirtyChange }) {
    let languages = [];
    let savedLearningLanguages = [];
    let savedTeachingLanguages = [];
    let pendingLearningLanguages = [];
    let pendingTeachingLanguages = [];

    async function loadLanguages() {
        const res = await apiFetch("/api/v1/study/languages");
        if (!res.ok) return [];
        const payload = await res.json();
        return Array.isArray(payload?.data) ? payload.data : [];
    }

    async function loadStudyPrefs() {
        const res = await apiFetch("/api/v1/study/preferences");
        if (!res.ok) return { learningLanguages: [], teachingLanguages: [] };
        const payload = await res.json();
        return (
            payload?.data ?? { learningLanguages: [], teachingLanguages: [] }
        );
    }

    function isDirty() {
        return (
            !listsEqual(savedLearningLanguages, pendingLearningLanguages) ||
            !listsEqual(savedTeachingLanguages, pendingTeachingLanguages)
        );
    }

    function markDirty() {
        onDirtyChange?.(isDirty());
    }

    function renderLanguageRows() {
        if (!languages.length) {
            return `<p class="profile-empty">${escapeHtml(i18n.t("ui.app.settings.study.no_languages"))}</p>`;
        }
        return `
            <table class="language-table study-language-table">
                <thead>
                    <tr>
                        <th>${escapeHtml(i18n.t("ui.reuse.language"))}</th>
                        <th>${escapeHtml(i18n.t("ui.app.settings.study.learn"))}</th>
                        <th>${escapeHtml(i18n.t("ui.app.settings.study.teach"))}</th>
                    </tr>
                </thead>
                <tbody>
                    ${languages
                        .map((language) => {
                            const code = language.code;
                            const name = language.name || code;
                            const flag = language.flag || "";
                            return `
                                <tr>
                                    <td>${escapeHtml(flag)} ${escapeHtml(name)} <code>${escapeHtml(code)}</code></td>
                                    <td><input type="checkbox" data-study-learn="${escapeHtml(code)}" ${pendingLearningLanguages.includes(code) ? "checked" : ""} /></td>
                                    <td><input type="checkbox" data-study-teach="${escapeHtml(code)}" ${pendingTeachingLanguages.includes(code) ? "checked" : ""} /></td>
                                </tr>
                            `;
                        })
                        .join("")}
                </tbody>
            </table>
            <div class="study-teacher-actions">
                ${pendingTeachingLanguages
                    .map(
                        (code) => `
                            <button type="button" class="btn-confirm btn-animated study-teacher-apply-btn" data-study-teacher-apply="${escapeHtml(code)}">
                                ${escapeHtml(i18n.t("ui.app.settings.study.apply_to_teach"))}: ${escapeHtml(code)}
                            </button>
                        `,
                    )
                    .join("")}
            </div>
        `;
    }

    function render() {
        const container = root.querySelector("#study-prefs-container");
        if (!container) return;
        container.innerHTML = `
            <h3>${escapeHtml(i18n.t("ui.app.settings.study.title"))}</h3>
            ${renderLanguageRows()}
        `;
        bindEvents();
    }

    async function submitTeacherApplication(languageCode) {
        let reason = "";
        const action = await openPopup({
            title: i18n.t("module.study.classes.teacher_application_title"),
            body: `
                <label class="stack">
                    ${escapeHtml(i18n.t("module.study.classes.teacher_application_reason"))}
                    <textarea id="study-teacher-reason" class="theme-select" rows="5"></textarea>
                </label>
            `,
            variant: "confirm",
            actions: [
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.popup.cancel"),
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
                const input = overlay.querySelector("#study-teacher-reason");
                reason = input?.value?.trim() ?? "";
                return true;
            },
        });
        if (action !== "submit") return;
        const response = await apiFetch("/api/v1/study/teacher-requests", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ languageCode, reason }),
        });
        showToast(
            i18n.t(
                response.ok
                    ? "ui.app.settings.study.application_sent"
                    : "ui.app.settings.study.application_failed",
            ),
            { variant: response.ok ? "success" : "error" },
        );
    }

    function bindEvents() {
        root.querySelectorAll("[data-study-learn]").forEach((input) => {
            input.addEventListener("change", () => {
                const code = input.dataset.studyLearn;
                pendingLearningLanguages = input.checked
                    ? normalizeList([...pendingLearningLanguages, code])
                    : pendingLearningLanguages.filter(
                          (value) => value !== code,
                      );
                markDirty();
            });
        });
        root.querySelectorAll("[data-study-teach]").forEach((input) => {
            input.addEventListener("change", () => {
                const code = input.dataset.studyTeach;
                pendingTeachingLanguages = input.checked
                    ? normalizeList([...pendingTeachingLanguages, code])
                    : pendingTeachingLanguages.filter(
                          (value) => value !== code,
                      );
                render();
                markDirty();
            });
        });
        root.querySelectorAll("[data-study-teacher-apply]").forEach(
            (button) => {
                button.addEventListener("click", () => {
                    void submitTeacherApplication(
                        button.dataset.studyTeacherApply,
                    );
                });
            },
        );
    }

    return {
        async init() {
            const [languageList, prefs] = await Promise.all([
                loadLanguages(),
                loadStudyPrefs(),
            ]);
            languages = languageList;
            savedLearningLanguages = normalizeList(prefs.learningLanguages);
            savedTeachingLanguages = normalizeList(prefs.teachingLanguages);
            pendingLearningLanguages = [...savedLearningLanguages];
            pendingTeachingLanguages = [...savedTeachingLanguages];
            render();
        },
        render,
        isDirty,
        getPendingPrefs() {
            return {
                learningLanguages: normalizeList(pendingLearningLanguages),
                teachingLanguages: normalizeList(pendingTeachingLanguages),
            };
        },
        commit() {
            savedLearningLanguages = normalizeList(pendingLearningLanguages);
            savedTeachingLanguages = normalizeList(pendingTeachingLanguages);
            onDirtyChange?.(false);
        },
        discard() {
            pendingLearningLanguages = [...savedLearningLanguages];
            pendingTeachingLanguages = [...savedTeachingLanguages];
            render();
            onDirtyChange?.(false);
        },
    };
}
