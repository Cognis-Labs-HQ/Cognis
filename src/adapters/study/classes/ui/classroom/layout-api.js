import { normalizeBoardFocus } from "/static/adapters/study/classes/board-focus.js";

/**
 * Creates the classroom layout PATCH helpers. All functions share the provided
 * context so callers in index.js only need to pass live accessors once.
 *
 * @param {{ apiFetch: Function, isTeacherView: Function, selectedSnapshot: Function, applySnapshotPatch: Function }} ctx
 */
export function createLayoutApi({
    apiFetch,
    isTeacherView,
    selectedSnapshot,
    applySnapshotPatch,
}) {
    async function patchClassroomLayout(classId, fields) {
        const normalizedClassId = String(classId ?? "").trim();
        if (!isTeacherView() || !normalizedClassId) {
            return false;
        }
        const response = await apiFetch(
            `/api/v1/study/classrooms/${encodeURIComponent(normalizedClassId)}/layout`,
            {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(fields),
            },
        );
        if (!response.ok) {
            return false;
        }
        const payload = await response.json().catch(() => null);
        applySnapshotPatch(normalizedClassId, payload?.data ?? fields);
        return true;
    }

    async function persistActiveWhiteboardId(classId, nextActiveWhiteboardId) {
        return patchClassroomLayout(classId, {
            activeWhiteboardId: nextActiveWhiteboardId ?? null,
        });
    }

    async function persistActiveMaterialKey(classId, nextActiveMaterialKey) {
        return patchClassroomLayout(classId, {
            activeMaterialKey: nextActiveMaterialKey ?? null,
        });
    }

    async function updateBoardFocus(nextFocus) {
        const snapshot = selectedSnapshot();
        if (!snapshot || !isTeacherView()) return;
        const normalizedFocus = normalizeBoardFocus(nextFocus);
        await patchClassroomLayout(snapshot.id, {
            boardFocus: normalizedFocus,
        });
    }

    async function patchViewLayout(layout) {
        const snapshot = selectedSnapshot();
        if (!snapshot || !isTeacherView()) return;
        const normalizedLayout =
            layout === "slideshow" ? "slideshow" : "stacked";
        await patchClassroomLayout(snapshot.id, {
            viewLayout: normalizedLayout,
        });
    }

    return {
        patchClassroomLayout,
        persistActiveWhiteboardId,
        persistActiveMaterialKey,
        updateBoardFocus,
        patchViewLayout,
    };
}
