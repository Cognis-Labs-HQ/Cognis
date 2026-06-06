import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { navigateTo } from "/static/reuse/app-router.js";
import {
    applyClassroomViewModeFromUrl,
    canToggleClassroomView,
    getClassroomViewMode,
    setClassroomViewMode,
} from "/static/adapters/study/classes/view-mode.js";

function renderClassSelectorContent({
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
        ? `<button type="button" class="classes-footer-toggle-btn">${escapeHtml(
              i18n.t(
                  getClassroomViewMode() === "teacher"
                      ? "module.study.classes.enter_student_view"
                      : "module.study.classes.enter_teacher_view",
              ),
          )}</button>`
        : "";
    return `
        <label class="classes-footer-class-label">
            ${escapeHtml(i18n.t("module.study.classes.classroom_select_class"))}:
            <select class="classes-footer-select">
                ${options || `<option value="">${emptyLabel}</option>`}${createOption}
            </select>
        </label>
        ${toggleButton}
    `;
}

export async function loadFooterClasses(languageCode = "") {
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

export function createClassFooterItem({
    i18n,
    signal,
    getClasses,
    getSelectedClassId,
    allowCreateOption = false,
    onSelectClass,
    onCreateClass,
}) {
    return {
        id: "class-selector",
        render: () =>
            renderClassSelectorContent({
                i18n,
                classes: getClasses(),
                selectedClassId: getSelectedClassId(),
                allowCreateOption,
            }),
        onRender: (slot) => {
            const selectElement = slot.querySelector(".classes-footer-select");
            const toggleButton = slot.querySelector(
                ".classes-footer-toggle-btn",
            );
            if (selectElement instanceof HTMLSelectElement) {
                selectElement.addEventListener(
                    "change",
                    () => {
                        const nextValue = String(
                            selectElement.value ?? "",
                        ).trim();
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
        },
    };
}
