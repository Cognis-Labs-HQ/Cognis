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

/**
 * Mounts the classroom notepad into the given host element for the current
 * snapshot. Creates a new notepad instance when the class changes; reuses the
 * existing one otherwise. Automatically focuses the notepad when workspace
 * mode is "notepad". Safe to call with a null host (no-op).
 *
 * @param {HTMLElement|null} host - The `.classes-notepad-host` element.
 * @param {object} options
 * @param {object|null} options.nextSnapshot - Current classroom snapshot.
 * @param {Function|null} options.createClassroomNotepad - Notepad factory.
 * @param {object|null} options.classroomNotepad - Existing notepad instance.
 * @param {string} options.classroomNotepadClassId - Class ID of existing notepad.
 * @param {object} options.i18n - i18n helper.
 * @param {() => string} options.getWorkspaceMode - Returns current workspace mode.
 * @returns {{ notepad: object|null, notepadClassId: string }}
 */
export function mountClassroomNotepad(
    host,
    {
        nextSnapshot,
        createClassroomNotepad,
        classroomNotepad,
        classroomNotepadClassId,
        i18n,
        getWorkspaceMode,
    },
) {
    if (
        !(host instanceof HTMLElement) ||
        !nextSnapshot ||
        !createClassroomNotepad
    ) {
        return {
            notepad: classroomNotepad,
            notepadClassId: classroomNotepadClassId,
        };
    }
    let notepad = classroomNotepad;
    let notepadClassId = classroomNotepadClassId;
    if (!notepad || notepadClassId !== nextSnapshot.id) {
        notepad = createClassroomNotepad({ classId: nextSnapshot.id, i18n });
        notepadClassId = nextSnapshot.id;
    }
    host.replaceChildren(notepad.getElement());
    if (getWorkspaceMode() === "notepad") {
        notepad.focus();
    }
    return { notepad, notepadClassId };
}
