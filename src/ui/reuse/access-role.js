/**
 * Maps access-role IDs to localized labels, exposes role option lists, and
 * provides lightweight scope predicates that read the active session role from
 * localStorage.
 *
 * Public exports:
 * - `ACCESS_ROLES` Ordered list of supported role IDs for selectors.
 * - `getRoleLabel(i18n, role)` Localizes a role ID into a user-facing label.
 * - `isAdminScope()` Returns true when the session role is `admin` or `owner`.
 * - `isTeacherScope()` Returns true when the session role is `teacher`.
 * - `isStudentScope()` Returns true when the session role is `user`, `admin`, or `owner`.
 *
 * @example
 * ```js
 * import { ACCESS_ROLES, getRoleLabel, isAdminScope } from '/static/reuse/access-role.js';
 * if (isAdminScope()) showAdminControls();
 * ```
 *
 * @param {{ t: (key: string) => string }} i18n i18n instance with `t()`.
 * @param {string | null | undefined} role Role ID to localize.
 * @returns {string} Localized role label, or the raw role when unknown.
 */
export const ACCESS_ROLES = ["user", "teacher", "moderator", "admin", "owner"];

export function getRoleLabel(i18n, role) {
    const normalizedRole = String(role ?? "").trim();
    const key = `ui.reuse.role_${normalizedRole}`;
    const label = i18n?.t?.(key);
    if (typeof label === "string" && label !== key) return label;
    return normalizedRole || "user";
}

/**
 * @returns {boolean} True when the active session role is `admin` or `owner`.
 */
export function isAdminScope() {
    const roleValue = String(localStorage.getItem("cognis_role") ?? "")
        .trim()
        .toLowerCase();
    return roleValue === "admin" || roleValue === "owner";
}

/**
 * @returns {boolean} True when the active session role is `teacher`.
 */
export function isTeacherScope() {
    const roleValue = String(localStorage.getItem("cognis_role") ?? "")
        .trim()
        .toLowerCase();
    return roleValue === "teacher";
}

/**
 * Returns true when the session role allows class enrolment as a student.
 * Teachers are excluded; admin and owner users are considered students too.
 *
 * @returns {boolean}
 */
export function isStudentScope() {
    const roleValue = String(localStorage.getItem("cognis_role") ?? "")
        .trim()
        .toLowerCase();
    return (
        roleValue === "user" || roleValue === "admin" || roleValue === "owner"
    );
}
