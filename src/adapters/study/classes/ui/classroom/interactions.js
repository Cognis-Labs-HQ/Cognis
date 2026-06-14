import { bindClassroomClickHandler } from "/static/adapters/study/classes/classroom/click-handler.js";
import { bindClassroomEnhancements } from "/static/adapters/study/classes/classroom-enhancements.js";

export function bindClassroomInteractions({
    root,
    signal,
    i18n,
    apiFetch,
    openPopup,
    escapeHtml,
    navigateTo,
    bindProfilePreviews,
    getInteractionsBound,
    setInteractionsBound,
    selectedSnapshot,
    getSelectedClassId,
    setSelectedClassId,
    getSelectedSeatNumber,
    setSelectedSeatNumber,
    getActiveWhiteboard,
    setActiveWhiteboard,
    getSelectedActiveWhiteboardId,
    getActiveMeetingId,
    getTeacherAccount,
    getClassroomViewMode,
    setClassroomViewMode,
    isTeacherView,
    getClassroomWindows,
    updateBoardFocus,
    normalizeWorkspaceMode,
    setWorkspaceMode,
    getSidebarMode,
    setSidebarMode,
    handleSeatActionMenu,
    openClassSettingsPopup,
    openClassSearch,
    refreshContent,
    refreshDom,
    refreshSubNavigation,
    refreshComposerFooter,
    syncWorkspaceModeWithSnapshot,
    syncGlobalChatTarget,
    showToast,
    handleClassroomExit,
    handleResourceActions,
    handleWhiteboardAndNotepadActions,
    handleFileActions,
    getClassResources,
    loadSelectedClassMeta,
    getClassroomNotepad,
    setClassroomNotepad,
    getClassroomNotepadClassId,
    setClassroomNotepadClassId,
    createClassroomNotepad,
    persistActiveWhiteboardId,
    getActiveMaterialKey,
    setActiveMaterialKey,
    persistActiveMaterialKey,
    loadAvailableClasses,
    setSelectedLanguageFilter,
    setSearchQuery,
    setNotebookText,
    setAgendaDocument,
    setBoardEntity,
    getBlackboardExpanded,
    setBlackboardExpanded,
    getTileLayout,
    setTileLayout,
    getTileOrder,
    setTileOrder,
    refreshWorkspaceTilesOnly,
    getIsTeacherPresent,
    loadActiveMaterialPreview,
}) {
    if (getInteractionsBound()) {
        return;
    }
    setInteractionsBound(true);
    bindProfilePreviews(i18n);
    let agendaAutosaveTimer = null;

    bindClassroomClickHandler({
        root,
        signal,
        i18n,
        apiFetch,
        openPopup,
        escapeHtml,
        navigateTo,
        selectedSnapshot,
        getSelectedClassId,
        setSelectedClassId,
        getSelectedSeatNumber,
        setSelectedSeatNumber,
        getActiveWhiteboard,
        setActiveWhiteboard,
        getSelectedActiveWhiteboardId,
        getActiveMeetingId,
        getTeacherAccount,
        getClassroomViewMode,
        setClassroomViewMode,
        isTeacherView,
        getClassroomWindows,
        updateBoardFocus,
        normalizeWorkspaceMode,
        setWorkspaceMode,
        getSidebarMode,
        setSidebarMode,
        handleSeatActionMenu,
        openClassSettingsPopup,
        openClassSearch,
        refreshContent,
        refreshDom,
        refreshSubNavigation,
        refreshComposerFooter,
        syncWorkspaceModeWithSnapshot,
        syncGlobalChatTarget,
        showToast,
        handleClassroomExit,
        handleResourceActions,
        handleWhiteboardAndNotepadActions,
        handleFileActions,
        getClassResources,
        loadSelectedClassMeta,
        getClassroomNotepad,
        setClassroomNotepad,
        getClassroomNotepadClassId,
        setClassroomNotepadClassId,
        createClassroomNotepad,
        persistActiveWhiteboardId,
        getActiveMaterialKey,
        setActiveMaterialKey,
        persistActiveMaterialKey,
        loadAvailableClasses,
        setSelectedLanguageFilter,
        setSearchQuery,
        setNotebookText,
        setAgendaDocument,
        setBoardEntity,
        getBlackboardExpanded,
        setBlackboardExpanded,
        getTileLayout,
        setTileLayout,
        getTileOrder,
        setTileOrder,
        refreshWorkspaceTilesOnly,
        getIsTeacherPresent,
        loadActiveMaterialPreview,
    });
    root.addEventListener(
        "change",
        async (event) => {
            if (!(event.target instanceof Element)) return;

            if (
                event.target instanceof HTMLSelectElement &&
                event.target.classList.contains(
                    "classes-agenda-style-select",
                ) &&
                isTeacherView()
            ) {
                const style = event.target.value;
                const editor = root.querySelector(
                    ".classes-agenda-document-editor",
                );
                if (!(editor instanceof HTMLTextAreaElement)) return;
                const start = editor.selectionStart;
                const end = editor.selectionEnd;
                const lineStart = editor.value.lastIndexOf("\n", start - 1) + 1;
                const lineEnd = editor.value.indexOf("\n", end);
                const actualLineEnd =
                    lineEnd === -1 ? editor.value.length : lineEnd;
                const lineText = editor.value.slice(lineStart, actualLineEnd);
                const stripped = lineText.replace(/^(#{1,3} |> |```\n?)/u, "");
                const prefixMap = {
                    heading1: "# ",
                    heading2: "## ",
                    heading3: "### ",
                    quote: "> ",
                    codeblock: "```\n",
                    normal: "",
                };
                const prefix = prefixMap[style] ?? "";
                const newLine = prefix + stripped;
                editor.setRangeText(newLine, lineStart, actualLineEnd, "end");
                editor.focus();
                event.target.value = style;
                return;
            }

            const snapshot = selectedSnapshot();
            const classResources = getClassResources();
            await handleResourceActions(event, {
                root,
                snapshot,
                classResources,
                apiFetch,
                i18n,
                showToast,
                openPopup,
                escapeHtml,
                loadSelectedClassMeta,
                refreshDom,
                setNotebookText,
            });
        },
        { signal },
    );
    root.addEventListener(
        "input",
        async (event) => {
            if (
                event.target instanceof HTMLInputElement &&
                event.target.classList.contains("classes-available-search")
            ) {
                setSearchQuery(event.target.value.trim());
                await loadAvailableClasses();
                refreshDom();
                return;
            }
            if (
                event.target instanceof HTMLTextAreaElement &&
                event.target.classList.contains(
                    "classes-agenda-document-editor",
                )
            ) {
                const selectedClassId = getSelectedClassId();
                if (!selectedClassId || !isTeacherView()) return;
                if (agendaAutosaveTimer !== null) {
                    clearTimeout(agendaAutosaveTimer);
                }
                const documentText = event.target.value ?? "";
                agendaAutosaveTimer = window.setTimeout(async () => {
                    await apiFetch(
                        `/api/v1/file-reader/text/classroom-notes/${encodeURIComponent(selectedClassId)}/agenda`,
                        {
                            method: "PUT",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({ document: documentText }),
                        },
                    );
                    setAgendaDocument(documentText);
                }, 450);
            }
        },
        { signal },
    );
    window.addEventListener(
        "keydown",
        (event) => {
            if (getTileLayout() !== "slideshow") return;
            const tilesContainer = root.querySelector(
                ".classes-workspace-tiles",
            );
            if (!(tilesContainer instanceof HTMLElement)) return;
            if (
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement ||
                event.target instanceof HTMLSelectElement
            ) {
                return;
            }
            const isLeft = event.key === "ArrowLeft";
            const isRight = event.key === "ArrowRight";
            if (!isLeft && !isRight) return;
            if (isStudentInteractionBlocked()) return;
            event.preventDefault();
            const currentOrder = getTileOrder();
            const activeMode = normalizeWorkspaceMode(
                tilesContainer.dataset.activeWorkspaceMode ?? "agenda",
            );
            const currentIndex = currentOrder.indexOf(activeMode);
            const nextIndex = isLeft
                ? (currentIndex - 1 + currentOrder.length) % currentOrder.length
                : (currentIndex + 1) % currentOrder.length;
            const nextMode = normalizeWorkspaceMode(
                currentOrder[nextIndex] ?? "agenda",
            );
            setWorkspaceMode(nextMode);
            if (getClassroomWindows()?.isMeetingOpen()) {
                refreshWorkspaceTilesOnly();
            } else {
                refreshDom();
            }
        },
        { signal },
    );
    bindClassroomEnhancements({
        root,
        signal,
        apiFetch,
        i18n,
        showToast,
        selectedSnapshot,
        setBoardEntity,
        refreshDom,
        refreshContent,
    });
}
