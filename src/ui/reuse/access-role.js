/**
 * Maps access-role IDs to localized labels and exposes role option lists.
 *
 * Public exports:
 * - `ACCESS_ROLES` Ordered list of supported role IDs for selectors.
 * - `getRoleLabel(i18n, role)` Localizes a role ID into a user-facing label.
 *
 * @example
 * ```js
 * import { ACCESS_ROLES, getRoleLabel } from '../reuse/access-role.js';
 * const options = ACCESS_ROLES.map((role) => ({
 *   value: role,
 *   label: getRoleLabel(i18n, role),
 * }));
 * ```
 *
 * @param {{ t: (key: string) => string }} i18n i18n instance with `t()`.
 * @param {string | null | undefined} role Role ID to localize.
 * @returns {string} Localized role label, or the raw role when unknown.
 */
export const ACCESS_ROLES = [
    "user",
    "teacher",
    "moderator",
    "admin",
    "owner",
];

export function getRoleLabel(i18n, role) {
    const normalizedRole = String(role ?? "").trim();
    const key = `ui.reuse.role_${normalizedRole}`;
    const label = i18n?.t?.(key);
    if (typeof label === "string" && label !== key) return label;
    return normalizedRole || "user";
}
