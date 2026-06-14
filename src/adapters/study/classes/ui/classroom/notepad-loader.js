/**
 * Loads the classroom notepad factory from the URL injected by the server via
 * the `classroom-notepad-script` meta tag. Returns null when the tag is absent
 * or the adapter script fails to load, allowing the classroom to degrade
 * gracefully without the notepad feature.
 *
 * @returns {Promise<Function|null>} The `createClassroomNotepad` factory, or
 *   null if the notepad adapter is unavailable.
 */
export async function loadNotepadFactory() {
    const scriptMeta = document.querySelector(
        'meta[name="classroom-notepad-script"]',
    );
    const scriptUrl = scriptMeta?.content?.trim() ?? "";
    if (!scriptUrl) return null;
    try {
        return (await import(scriptUrl)).createClassroomNotepad;
    } catch (err) {
        console.error("[classroom] Failed to load notepad adapter.", {
            operation: "importNotepadScript",
            url: scriptUrl,
            error: err instanceof Error ? err.message : String(err),
        });
        return null;
    }
}

/**
 * Reads the notepad i18n strings base URL injected by the server via the
 * `classroom-notepad-strings` meta tag.
 *
 * @returns {string} The strings base URL, or an empty string if absent.
 */
export function getNotepadStringsBaseUrl() {
    const stringsMeta = document.querySelector(
        'meta[name="classroom-notepad-strings"]',
    );
    return stringsMeta?.content?.trim() ?? "";
}
