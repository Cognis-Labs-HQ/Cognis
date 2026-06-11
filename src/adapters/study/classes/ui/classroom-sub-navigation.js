import { escapeHtml } from "/static/reuse/escape-html.js";

export function renderClassroomSubNavigation({
    i18n,
    classes,
    selectedClassId,
}) {
    const classButtons = classes
        .map((classRow) => {
            const classId = String(classRow?.id ?? "").trim();
            if (!classId) return "";
            const classLabel = String(
                classRow.name ??
                    classRow.languageName ??
                    classRow.languageCode ??
                    classId,
            ).trim();
            const activeClass = classId === selectedClassId ? " active" : "";
            return `<li><button type="button" class="classes-subnav-class-btn${activeClass}" data-class-id="${escapeHtml(classId)}">${escapeHtml(classLabel)}</button></li>`;
        })
        .join("");
    const findButton = `<li><button type="button" class="classes-subnav-find-btn">${escapeHtml(i18n.t("ui.layout.search.aria"))}</button></li>`;
    return `
        <div class="classes-classroom-subnav">
            <ul class="page-subnav-list classes-classroom-subnav-list">
                ${findButton}
                ${classButtons}
            </ul>
        </div>
    `;
}
