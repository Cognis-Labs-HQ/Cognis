/**
 * Navigates dashboard controls to a section of User Settings through the app router.
 *
 * - navigateToSettingsSection() — follows an internal settings link so the
 *   dashboard router mounts the requested settings section in place.
 *
 * Usage:
 *   navigateToSettingsSection('appearance');
 *
 * @param {string} sectionId
 * @returns {void}
 */
export function navigateToSettingsSection(sectionId) {
    const link = document.createElement("a");
    link.href = `/settings#${encodeURIComponent(sectionId)}`;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
}
