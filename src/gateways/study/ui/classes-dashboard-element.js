import { escapeHtml } from "/static/reuse/escape-html.js";

/**
 * Dashboard page extension factory for the Study/Classes adapter.
 */
export function createPageElement({ i18n, role }) {
    if (role === "teacher") {
        return {
            id: "teacher-classes",
            label: i18n.t("ui.app.dashboard.element.teacher_classes.label"),
            gridSize: { default: [6, 3], min: [3, 2] },
            render: () => `
      <h3>${escapeHtml(i18n.t("ui.app.dashboard.element.teacher_classes.label"))}</h3>
      <p class="dashboard-teacher-classes-placeholder">
        ${escapeHtml(i18n.t("ui.app.dashboard.element.teacher_classes.empty"))}
      </p>
    `,
        };
    }
    if (role === "user") {
        return {
            id: "student-classes",
            label: i18n.t("ui.app.dashboard.element.student_classes.label"),
            gridSize: { default: [6, 3], min: [3, 2] },
            render: () => `
      <h3>${escapeHtml(i18n.t("ui.app.dashboard.element.student_classes.label"))}</h3>
      <p class="dashboard-classes-placeholder">
        ${escapeHtml(i18n.t("ui.app.dashboard.element.student_classes.cta"))}
      </p>
      <a href="/classroom" class="btn-confirm btn-animated">${escapeHtml(i18n.t("ui.app.dashboard.element.student_classes.go"))}</a>
    `,
        };
    }
    return null;
}
