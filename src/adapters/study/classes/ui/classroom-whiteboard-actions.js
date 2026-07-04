/**
 * Handles classroom workspace actions for notepad and whiteboards. Returns true
 * when the click was consumed.
 *
 * @param {MouseEvent} event
 * @param {object} deps
 * @returns {Promise<boolean>}
 */
export async function handleWhiteboardAndNotepadActions(
    event,
    {
        snapshot,
        i18n,
        showToast,
        refreshDom,
        getClassroomNotepad,
        setClassroomNotepad,
        getClassroomNotepadClassId,
        setClassroomNotepadClassId,
        createClassroomNotepad,
        setWorkspaceMode,
        handleWhiteboardActions,
        ...whiteboardDeps
    },
) {
    if (!(event.target instanceof Element)) return false;

    function ensureNotepad() {
        if (!snapshot || !createClassroomNotepad) return null;
        const currentClassId = getClassroomNotepadClassId();
        let notepad = getClassroomNotepad();
        if (!notepad || currentClassId !== snapshot.id) {
            notepad = createClassroomNotepad({
                classId: snapshot.id,
                i18n,
            });
            setClassroomNotepad(notepad);
            setClassroomNotepadClassId(snapshot.id);
        }
        return notepad;
    }

    if (event.target.closest(".classes-toggle-notepad-btn")) {
        if (!snapshot) return false;
        ensureNotepad();
        setWorkspaceMode("notepad");
        refreshDom();
        return true;
    }

    if (typeof handleWhiteboardActions === "function") {
        return handleWhiteboardActions(event, {
            snapshot,
            showToast,
            setWorkspaceMode,
            refreshDom,
            ...whiteboardDeps,
        });
    }

    return false;
}
