import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { navigateTo } from "/static/reuse/app-router.js";
import {
    applyClassroomViewModeFromUrl,
    getClassroomViewMode,
} from "/static/adapters/study/classes/view-mode.js";

function renderClassSelectorContent({
    i18n,
    classes,
    selectedClassId,
    allowCreateOption = false,
}) {
    const viewerAccountId = String(
        localStorage.getItem("cognis_account") ?? "",
    ).trim();
    const options = classes
        .map((classRow) => {
            const selected = classRow.id === selectedClassId ? " selected" : "";
            const classLabel = String(
                classRow.name ??
                    classRow.languageName ??
                    classRow.languageCode ??
                    classRow.id,
            ).trim();
            const classTypeLabel =
                classRow.teacherAccountId === viewerAccountId
                    ? i18n.t("module.study.classes.enter_teacher_view")
                    : i18n.t("module.study.classes.enter_student_view");
            return `<option value="${escapeHtml(classRow.id)}"${selected}>${escapeHtml(`${classLabel} (${classTypeLabel})`)}</option>`;
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
    return `
        <label class="classes-footer-class-label">
            ${escapeHtml(i18n.t("module.study.classes.classroom_select_class"))}:
            <select class="classes-footer-select">
                <option value="__find__">${escapeHtml(i18n.t("ui.reuse.search"))}</option>
                ${options || `<option value="">${emptyLabel}</option>`}${createOption}
            </select>
        </label>
    `;
}

export async function loadFooterClasses(languageCode = "") {
    applyClassroomViewModeFromUrl();
    const params = new URLSearchParams();
    if (getClassroomViewMode() === "student") {
        params.set("student", "true");
    }
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
                        if (nextValue === "__find__") {
                            const searchUrl =
                                String(
                                    localStorage.getItem("cognis_role") ?? "",
                                )
                                    .trim()
                                    .toLowerCase() === "teacher"
                                    ? "/classroom?student=true"
                                    : "/classroom";
                            navigateTo(searchUrl);
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
        },
    };
}
