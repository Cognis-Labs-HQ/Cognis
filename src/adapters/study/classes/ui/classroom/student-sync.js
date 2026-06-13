import { normalizeBoardFocus } from "/static/adapters/study/classes/board-focus.js";
import { moveTileToStackEnd } from "/static/adapters/study/classes/classroom/helpers.js";

/**
 * Creates helpers that keep a student's workspace in sync with the teacher's
 * view state. One polls the dedicated API endpoint; the other reads the
 * classroom snapshot directly.
 *
 * @param {{ apiFetch: Function, isTeacherView: Function, normalizeTileLayout: Function, selectedSnapshot: Function, getNormalizedBoardFocus: Function, setWorkspaceMode: Function, initializedTiles: Set<string>, getSelectedClassId: Function, setTileLayout: Function, getActiveMeetingId: Function, getClassroomWindows: Function, getWorkspaceMode: Function, getLastNonMeetingMode: Function, getActiveMaterialKey: Function, setActiveMaterialKey: Function, loadActiveMaterialPreview: Function, applyMaterialViewport: Function }} ctx
 */
export function createStudentSync({
    apiFetch,
    isTeacherView,
    normalizeTileLayout,
    selectedSnapshot,
    getNormalizedBoardFocus,
    setWorkspaceMode,
    initializedTiles,
    getSelectedClassId,
    setTileLayout,
    getActiveMeetingId,
    getClassroomWindows,
    getWorkspaceMode,
    getLastNonMeetingMode,
    getTileOrder,
    setTileOrder,
    getActiveMaterialKey,
    setActiveMaterialKey,
    loadActiveMaterialPreview,
    applyMaterialViewport,
}) {
    const MEETING_SYNC_GRACE_MS = 12000;
    let meetingModeWithoutMeetingSince = 0;

    async function pollTeacherViewState() {
        const selectedClassId = getSelectedClassId();
        if (isTeacherView() || !selectedClassId) return;
        try {
            const response = await apiFetch(
                `/api/v1/study/classrooms/${encodeURIComponent(selectedClassId)}/view-state`,
            );
            if (!response.ok) return;
            const data = await response.json();
            const boardFocus = normalizeBoardFocus(data?.boardFocus);
            const viewLayout = normalizeTileLayout(
                String(data?.viewLayout ?? "stacked"),
            );
            const broadcastedMaterialKey =
                String(data?.activeMaterialKey ?? "").trim() || null;
            if (boardFocus === "chat") initializedTiles.add("chat");
            if (boardFocus === "whiteboard") initializedTiles.add("whiteboard");
            if (boardFocus) {
                setWorkspaceMode(boardFocus, { remember: true });
                setTileOrder(
                    moveTileToStackEnd(
                        getTileOrder(),
                        boardFocus === "classroom" ? "agenda" : boardFocus,
                    ),
                );
            }
            setTileLayout(viewLayout);
            if (
                broadcastedMaterialKey !== null &&
                broadcastedMaterialKey !== getActiveMaterialKey()
            ) {
                setActiveMaterialKey(broadcastedMaterialKey);
                await loadActiveMaterialPreview(broadcastedMaterialKey);
            } else if (
                broadcastedMaterialKey === null &&
                getActiveMaterialKey()
            ) {
                setActiveMaterialKey(null);
            }
            if (
                data?.materialViewport &&
                typeof applyMaterialViewport === "function"
            ) {
                applyMaterialViewport(data.materialViewport);
            }
        } catch {
            // view-state polling failures are non-fatal
        }
    }

    function syncStudentWorkspaceAccess(snapshot = selectedSnapshot()) {
        if (isTeacherView() || !snapshot) return;
        const activeMeetingId = getActiveMeetingId();
        const classroomWindows = getClassroomWindows();
        const workspaceMode = getWorkspaceMode();
        const meetingAutoJoinBlocked = Boolean(
            activeMeetingId &&
            classroomWindows?.isMeetingDismissed?.(activeMeetingId),
        );
        let allowMeetingFallback = true;
        const shouldDelayMeetingFallback =
            workspaceMode === "meeting" &&
            !classroomWindows?.isMeetingOpen() &&
            !activeMeetingId &&
            !meetingAutoJoinBlocked;
        if (shouldDelayMeetingFallback) {
            const now = Date.now();
            if (!meetingModeWithoutMeetingSince) {
                meetingModeWithoutMeetingSince = now;
            }
            if (now - meetingModeWithoutMeetingSince < MEETING_SYNC_GRACE_MS) {
                allowMeetingFallback = false;
            }
        } else {
            meetingModeWithoutMeetingSince = 0;
        }
        if (
            allowMeetingFallback &&
            workspaceMode === "meeting" &&
            !classroomWindows?.isMeetingOpen() &&
            (!activeMeetingId || meetingAutoJoinBlocked)
        ) {
            setWorkspaceMode(getLastNonMeetingMode(), { remember: false });
        }
        const boardFocus = getNormalizedBoardFocus(
            snapshot,
            normalizeBoardFocus,
        );
        if (boardFocus === "chat") initializedTiles.add("chat");
        if (boardFocus === "whiteboard") initializedTiles.add("whiteboard");
        if (boardFocus) {
            setWorkspaceMode(boardFocus, { remember: true });
            setTileOrder(
                moveTileToStackEnd(
                    getTileOrder(),
                    boardFocus === "classroom" ? "agenda" : boardFocus,
                ),
            );
        }
    }

    return { pollTeacherViewState, syncStudentWorkspaceAccess };
}
