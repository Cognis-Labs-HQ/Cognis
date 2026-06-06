import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { navigateTo } from "/static/reuse/app-router.js";
import {
    applyClassroomViewModeFromUrl,
    canToggleClassroomView,
    getClassroomViewMode,
    setClassroomViewMode,
} from "/static/adapters/study/classes/view-mode.js";

function renderFooter({
    i18n,
    classes,
    selectedClassId,
    allowCreateOption = false,
}) {
    const options = classes
        .map((classRow) => {
            const selected = classRow.id === selectedClassId ? " selected" : "";
            return `<option value="${escapeHtml(classRow.id)}"${selected}>${escapeHtml(classRow.languageCode)} · ${escapeHtml(classRow.id)}</option>`;
        })
        .join("");
    const createOption = allowCreateOption
        ? `<option value="__create__">${escapeHtml(i18n.t("module.study.classes.create_class_option"))}</option>`
        : "";
    const emptyLabel = escapeHtml(
        i18n.t(
            getClassroomViewMode() === "teacher"
                ? "module.study.classes.no_teacher_classes"
                : "module.study.classes.no_enrolled_classes",
        ),
    );
    const toggleButton = canToggleClassroomView()
        ? `<button type="button" class="btn-confirm btn-animated classes-footer-toggle-btn">${escapeHtml(i18n.t(getClassroomViewMode() === "teacher" ? "module.study.classes.enter_student_view" : "module.study.classes.enter_teacher_view"))}</button>`
        : "";
    return `
        <div class="classes-footer-bar">
            <label class="classes-footer-label">
                <span>${escapeHtml(i18n.t("module.study.classes.footer_selector_label"))}</span>
                <select class="theme-select classes-footer-select">
                    ${options || `<option value="">${emptyLabel}</option>`}${createOption}
                </select>
            </label>
            ${toggleButton}
        </div>
    `;
}

async function loadFooterClasses(languageCode = "") {
    applyClassroomViewModeFromUrl();
    const params = new URLSearchParams();
    params.set("mode", getClassroomViewMode());
    if (languageCode) {
        params.set("language", languageCode);
    }
    const response = await apiFetch(
        `/api/v1/study/classrooms?${params.toString()}`,
    );
    if (!response.ok) {
        return [];
    }
    const payload = await response.json();
    return Array.isArray(payload?.data) ? payload.data : [];
}

export async function mountStudyClassFooter({
    root,
    signal,
    i18n,
    languageCode = "",
    selectedClassId = "",
    allowCreateOption = false,
    onSelectClass,
    onCreateClass,
}) {
    const classes = await loadFooterClasses(languageCode);
    const container = document.createElement("div");
    container.className = "classes-footer-slot";
    container.innerHTML = renderFooter({
        i18n,
        classes,
        selectedClassId,
        allowCreateOption,
    });
    root.appendChild(container);

    const selectElement = container.querySelector(".classes-footer-select");
    const toggleButton = container.querySelector(".classes-footer-toggle-btn");
    if (selectElement instanceof HTMLSelectElement) {
        selectElement.addEventListener(
            "change",
            () => {
                const nextValue = String(selectElement.value ?? "").trim();
                if (nextValue === "__create__") {
                    onCreateClass?.();
                    return;
                }
                if (!nextValue) return;
                if (typeof onSelectClass === "function") {
                    onSelectClass(nextValue);
                    return;
                }
                navigateTo(
                    `/classroom?classId=${encodeURIComponent(nextValue)}`,
                );
            },
            { signal },
        );
    }
    if (toggleButton instanceof HTMLButtonElement) {
        toggleButton.addEventListener(
            "click",
            () => {
                const nextMode =
                    getClassroomViewMode() === "teacher"
                        ? "student"
                        : "teacher";
                setClassroomViewMode(nextMode);
                navigateTo(
                    `${window.location.pathname}?classroomView=${encodeURIComponent(nextMode)}`,
                );
            },
            { signal },
        );
    }

    return {
        classes,
        destroy() {
            container.remove();
        },
    };
}
