import { renderClassroomPage } from "/static/adapters/study/classes/classroom-render.js";

/**
 * Creates a `renderContentMarkup()` function that produces the full classroom
 * content HTML string for injection into `.classes-classroom-content`.
 *
 * All dynamic values are read via getter callbacks so the returned function
 * always reflects the latest state at call time.
 *
 * @returns {() => string} renderContentMarkup
 */
export function createContentMarkupRenderer({
    selectedSnapshot,
    getFullClassResources,
    getSelectedSeatNumber,
    getSelectedNotebookText,
    i18n,
    isTeacherView,
    getAvailableClasses,
    getSelectedLanguageFilter,
    getSearchQuery,
    getTeacherAccount,
    getClassroomViewMode,
    getBoardEntities,
    getWorkspaceMode,
    getActiveMaterialKey,
    getMaterialPreviewState,
    getWhiteboards,
    getActiveWhiteboard,
    getSelectedActiveWhiteboardId,
    getActiveMeetingId,
    getClassroomWindows,
    getBlackboardExpanded,
    getInitializedTiles,
    getWhiteboardEnabled,
    getTileState,
    computeIsTeacherPresent,
}) {
    return function renderContentMarkup() {
        const snapshot = selectedSnapshot();
        const { tileLayout, tileOrder } = getTileState();
        return renderClassroomPage({
            snapshot,
            classResources: getFullClassResources(),
            selectedSeatNumber: getSelectedSeatNumber(),
            selectedNotebookText: getSelectedNotebookText(),
            i18n,
            isTeacherView: isTeacherView(),
            availableClasses: getAvailableClasses(),
            selectedLanguageFilter: getSelectedLanguageFilter(),
            searchQuery: getSearchQuery(),
            canToggleView: getTeacherAccount(),
            currentViewMode: getClassroomViewMode(),
            canEditMaterials: getTeacherAccount(),
            boardEntities: getBoardEntities(snapshot),
            workspaceMode: getWorkspaceMode(),
            activeMaterialKey: getActiveMaterialKey(),
            activeMaterialPreview: getMaterialPreviewState(),
            whiteboards: getWhiteboards(),
            activeWhiteboard: getActiveWhiteboard(),
            activeWhiteboardId: getSelectedActiveWhiteboardId(snapshot),
            hasActiveMeeting: Boolean(getActiveMeetingId()),
            isChatOpen: getClassroomWindows()?.isChatOpen() ?? false,
            isMeetingOpen: getClassroomWindows()?.isMeetingOpen() ?? false,
            blackboardExpanded: getBlackboardExpanded(),
            initializedTiles: getInitializedTiles(),
            whiteboardEnabled: getWhiteboardEnabled(),
            tileLayout,
            tileOrder,
            isTeacherPresent: computeIsTeacherPresent(snapshot),
        });
    };
}
