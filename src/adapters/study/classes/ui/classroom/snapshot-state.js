export function createSnapshotStateHelpers({
    teacherAccount,
    getClassroomViewMode,
    selectedSnapshot,
    presenceByAccountId,
}) {
    function isTeacherView() {
        return teacherAccount && getClassroomViewMode() === "teacher";
    }

    function computeIsTeacherPresent(snapshot = selectedSnapshot()) {
        if (isTeacherView()) return false;
        const teacherAccountId = String(
            snapshot?.teacherAccountId ?? "",
        ).trim();
        return Boolean(
            teacherAccountId &&
                presenceByAccountId.get(teacherAccountId) === "online",
        );
    }

    function getSelectedActiveWhiteboardId(snapshot = selectedSnapshot()) {
        const activeWhiteboardId = String(
            snapshot?.classroom?.activeWhiteboardId ?? "",
        ).trim();
        return activeWhiteboardId || null;
    }

    function getSelectedActiveMaterialKey(snapshot = selectedSnapshot()) {
        const key = String(snapshot?.classroom?.activeMaterialKey ?? "").trim();
        return key || null;
    }

    return {
        isTeacherView,
        computeIsTeacherPresent,
        getSelectedActiveWhiteboardId,
        getSelectedActiveMaterialKey,
    };
}
