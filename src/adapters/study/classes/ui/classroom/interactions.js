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
    normalizeSidebarMode,
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
    setBoardEntity,
    getBlackboardExpanded,
    setBlackboardExpanded,
}) {
    if (getInteractionsBound()) {
        return;
    }
    setInteractionsBound(true);
    bindProfilePreviews(i18n);
    let agendaAutosaveTimer = null;
    root.addEventListener(
        "click",
        async (event) => {
            if (!(event.target instanceof Element)) return;
            const snapshot = selectedSnapshot();
            const classroomWindows = getClassroomWindows();
            const selectedClassId = getSelectedClassId();
            const activeWhiteboard = getActiveWhiteboard();
            const profileButton = event.target.closest(
                ".classes-member-profile-btn",
            );
            if (profileButton instanceof HTMLElement) {
                const handle = String(
                    profileButton.dataset.studentHandle ?? "",
                ).trim();
                if (handle) {
                    navigateTo(`/profile/${encodeURIComponent(handle)}`);
                }
                return;
            }

            const sidebarButton = event.target.closest(
                ".classes-side-panel-btn[data-sidebar-mode]",
            );
            if (sidebarButton instanceof HTMLElement) {
                setSidebarMode(
                    normalizeSidebarMode(sidebarButton.dataset.sidebarMode),
                );
                if (sidebarButton.dataset.sidebarMode !== "materials") {
                    setActiveMaterialKey(null);
                }
                refreshDom();
                return;
            }

            const viewerBackButton = event.target.closest(
                ".classes-material-viewer-back",
            );
            if (viewerBackButton instanceof HTMLElement) {
                setActiveMaterialKey(null);
                if (isTeacherView()) {
                    await persistActiveMaterialKey(getSelectedClassId(), null);
                }
                refreshDom();
                return;
            }

            const workspaceButton = event.target.closest(
                ".classes-workspace-tab-btn[data-workspace-mode], .classes-workspace-tile-hitbox[data-workspace-mode]",
            );
            if (workspaceButton instanceof HTMLElement) {
                const nextWorkspaceMode = normalizeWorkspaceMode(
                    workspaceButton.dataset.workspaceMode,
                );
                if (nextWorkspaceMode === "meeting") {
                    if (classroomWindows?.isMeetingOpen()) {
                        setWorkspaceMode("meeting", {
                            remember: false,
                        });
                        setBlackboardExpanded(true);
                        refreshDom();
                        return;
                    }
                    if (!snapshot) {
                        return;
                    }
                    if (isTeacherView()) {
                        await classroomWindows?.openMeeting(snapshot);
                    } else {
                        await classroomWindows?.tryAutoJoin(snapshot.id);
                    }
                    if (classroomWindows?.isMeetingOpen()) {
                        setWorkspaceMode("meeting", {
                            remember: false,
                        });
                        setBlackboardExpanded(true);
                        refreshDom();
                    }
                    return;
                }
                if (nextWorkspaceMode === "agenda") {
                    if (isTeacherView()) {
                        await updateBoardFocus("agenda");
                    } else {
                        setWorkspaceMode(nextWorkspaceMode);
                    }
                } else {
                    if (
                        nextWorkspaceMode === "whiteboard" &&
                        !activeWhiteboard
                    ) {
                        setActiveWhiteboard(null);
                    }
                    setWorkspaceMode(nextWorkspaceMode);
                }
                setBlackboardExpanded(true);
                refreshDom();
                return;
            }

            const seatButton = event.target.closest(".classes-desk-unit");
            if (seatButton instanceof HTMLElement) {
                if (
                    seatButton.classList.contains("classes-desk-unit--teacher")
                ) {
                    return;
                }
                if (
                    !Number.isInteger(
                        Number(seatButton.dataset.seatNumber ?? ""),
                    )
                ) {
                    return;
                }
                setSelectedSeatNumber(
                    Number(seatButton.dataset.seatNumber ?? "-1"),
                );
                if (isTeacherView()) {
                    await handleSeatActionMenu(seatButton);
                } else {
                    refreshDom();
                }
                return;
            }

            if (event.target.closest(".classes-open-chat-btn")) {
                if (!classroomWindows || !snapshot) {
                    showToast(i18n.t("module.study.classes.chat_failed"), {
                        variant: "error",
                    });
                    return;
                }
                syncGlobalChatTarget();
                if (classroomWindows.isMeetingOpen()) {
                    const chatToggle = root.querySelector(
                        "#global-chat-toggle",
                    );
                    if (chatToggle instanceof HTMLElement) {
                        chatToggle.dataset.chatTarget = String(
                            snapshot.chatUrl ?? "",
                        ).trim();
                        chatToggle.dispatchEvent(
                            new MouseEvent("click", {
                                bubbles: true,
                                cancelable: true,
                            }),
                        );
                    } else {
                        classroomWindows.toggleChat(snapshot.chatUrl);
                    }
                    return;
                }
                setWorkspaceMode("chat");
                refreshDom();
                classroomWindows.openChat(snapshot.chatUrl);
                return;
            }

            if (
                event.target.closest("#global-chat-toggle") &&
                classroomWindows
            ) {
                const chatToggle = root.querySelector("#global-chat-toggle");
                const chatUrl = String(
                    chatToggle?.dataset.chatTarget ?? "",
                ).trim();
                classroomWindows.toggleChat(chatUrl);
                return;
            }

            if (event.target.closest(".classes-open-meeting-btn") && snapshot) {
                if (!isTeacherView() && !getActiveMeetingId()) {
                    return;
                }
                if (isTeacherView()) {
                    await classroomWindows?.openMeeting(snapshot);
                } else {
                    await classroomWindows?.tryAutoJoin(snapshot.id);
                }
                if (classroomWindows?.isMeetingOpen()) {
                    setWorkspaceMode("meeting", {
                        remember: false,
                    });
                    refreshDom();
                }
                return;
            }

            if (event.target.closest(".classes-agenda-snapshot-save-btn")) {
                if (!isTeacherView() || !selectedClassId) return;
                const editor = root.querySelector(
                    ".classes-agenda-document-editor",
                );
                if (!(editor instanceof HTMLTextAreaElement)) return;
                const saveResponse = await apiFetch(
                    `/api/v1/study/classes/${encodeURIComponent(selectedClassId)}/agenda/snapshots`,
                    {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                            document: editor.value ?? "",
                        }),
                    },
                );
                if (saveResponse.ok) {
                    await loadSelectedClassMeta();
                    refreshDom();
                }
                return;
            }

            if (event.target.closest(".classes-agenda-snapshot-open-btn")) {
                if (!selectedClassId) return;
                const snapshotSelect = root.querySelector(
                    ".classes-agenda-snapshot-select",
                );
                if (!(snapshotSelect instanceof HTMLSelectElement)) return;
                const snapshotId = String(snapshotSelect.value ?? "").trim();
                if (!snapshotId) return;
                const openResponse = await apiFetch(
                    `/api/v1/study/classes/${encodeURIComponent(selectedClassId)}/agenda/open`,
                    {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ snapshotId }),
                    },
                );
                if (!openResponse.ok) return;
                await loadSelectedClassMeta();
                refreshDom();
                return;
            }

            if (event.target.closest(".classes-class-settings-btn")) {
                await openClassSettingsPopup({
                    snapshot,
                    i18n,
                    apiFetch,
                    openPopup,
                    showToast,
                    refreshContent,
                });
                return;
            }

            if (
                event.target.closest(".classes-toggle-view-btn") &&
                getTeacherAccount()
            ) {
                const nextMode =
                    getClassroomViewMode() === "teacher"
                        ? "student"
                        : "teacher";
                setClassroomViewMode(nextMode);
                await refreshContent();
                return;
            }

            const subnavFindButton = event.target.closest(
                ".classes-subnav-find-btn",
            );
            if (subnavFindButton instanceof HTMLElement) {
                await openClassSearch();
                return;
            }

            const subnavClassButton = event.target.closest(
                ".classes-subnav-class-btn[data-class-id]",
            );
            if (subnavClassButton instanceof HTMLElement) {
                const previousClassId = selectedClassId;
                const previousInlineWhiteboardId =
                    activeWhiteboard?.boardId ?? null;
                const classId = String(
                    subnavClassButton.dataset.classId ?? "",
                ).trim();
                if (!classId) return;
                setSelectedClassId(classId);
                setSelectedSeatNumber(null);
                setActiveWhiteboard(null);
                if (
                    previousClassId &&
                    previousClassId !== classId &&
                    previousInlineWhiteboardId &&
                    !classroomWindows?.isWhiteboardOpen()
                ) {
                    void persistActiveWhiteboardId(previousClassId, null);
                }
                syncWorkspaceModeWithSnapshot({ force: false });
                await loadSelectedClassMeta();
                refreshDom();
                refreshSubNavigation();
                refreshComposerFooter();
                return;
            }

            const quickApproveButton = event.target.closest(
                ".classes-quick-approve-btn",
            );
            if (quickApproveButton instanceof HTMLElement && selectedClassId) {
                const studentId = String(
                    quickApproveButton.dataset.studentId ?? "",
                ).trim();
                if (!studentId) return;
                const response = await apiFetch(
                    `/api/v1/study/classes/${encodeURIComponent(selectedClassId)}/join-requests/${encodeURIComponent(studentId)}/approve`,
                    { method: "POST" },
                );
                showToast(
                    i18n.t(
                        response.ok
                            ? "module.study.classes.request_approved"
                            : "module.study.classes.request_review_failed",
                    ),
                    {
                        variant: response.ok ? "success" : "error",
                    },
                );
                if (response.ok) {
                    await refreshContent();
                }
                return;
            }

            if (event.target.closest("#study-classroom-door")) {
                await handleClassroomExit({
                    snapshot,
                    isTeacherView: isTeacherView(),
                    i18n,
                    openPopup,
                    apiFetch,
                    showToast,
                    onSuccess: async (kind) => {
                        if (kind === "disband") {
                            setSelectedClassId("");
                            setSelectedSeatNumber(null);
                        }
                        await refreshContent();
                    },
                });
                return;
            }

            if (
                await handleResourceActions(event, {
                    root,
                    snapshot,
                    classResources: getClassResources(),
                    apiFetch,
                    i18n,
                    showToast,
                    openPopup,
                    escapeHtml,
                    loadSelectedClassMeta,
                    refreshDom,
                    setNotebookText,
                })
            ) {
                return;
            }

            if (event.target.closest(".classes-leave-classroom-btn")) {
                await handleClassroomExit({
                    snapshot,
                    isTeacherView: false,
                    i18n,
                    openPopup,
                    apiFetch,
                    showToast,
                    onSuccess: async () => {
                        await refreshContent();
                    },
                });
                return;
            }

            if (
                await handleFileActions(event, {
                    snapshot,
                    apiFetch,
                    i18n,
                    showToast,
                    openPopup,
                    escapeHtml,
                    isTeacherView,
                })
            ) {
                return;
            }

            if (
                await handleWhiteboardAndNotepadActions(event, {
                    snapshot,
                    apiFetch,
                    i18n,
                    showToast,
                    openPopup,
                    escapeHtml,
                    classroomWindows,
                    isTeacherView,
                    loadSelectedClassMeta,
                    refreshDom,
                    getClassroomNotepad,
                    setClassroomNotepad,
                    getClassroomNotepadClassId,
                    setClassroomNotepadClassId,
                    createClassroomNotepad,
                    getActiveWhiteboard,
                    setActiveWhiteboard,
                    getActiveWhiteboardId: () =>
                        getSelectedActiveWhiteboardId(snapshot),
                    persistActiveWhiteboardId,
                    setWorkspaceMode,
                })
            ) {
                return;
            }

            const joinButton = event.target.closest(".classes-join-btn");
            if (joinButton instanceof HTMLElement) {
                const classId = joinButton.dataset.classId ?? "";
                const response = await apiFetch(
                    `/api/v1/study/classes/${encodeURIComponent(classId)}/join`,
                    { method: "POST" },
                );
                showToast(
                    i18n.t(
                        response.ok
                            ? "module.study.classes.join_sent"
                            : "module.study.classes.join_failed",
                    ),
                    {
                        variant: response.ok ? "success" : "error",
                    },
                );
                if (response.ok) {
                    await refreshContent();
                }
                return;
            }

            const filterButton = event.target.closest("[data-language]");
            if (filterButton instanceof HTMLElement) {
                setSelectedLanguageFilter(filterButton.dataset.language ?? "");
                await loadAvailableClasses();
                refreshDom();
            }
        },
        { signal },
    );
    root.addEventListener(
        "dblclick",
        async (event) => {
            if (!(event.target instanceof Element)) return;
            const materialTile = event.target.closest(
                ".classes-material-tile[data-material-key]",
            );
            if (materialTile instanceof HTMLElement) {
                const materialKey = String(
                    materialTile.dataset.materialKey ?? "",
                ).trim();
                if (!materialKey) return;
                setActiveMaterialKey(materialKey);
                setSidebarMode("materials");
                if (isTeacherView()) {
                    await persistActiveMaterialKey(
                        getSelectedClassId(),
                        materialKey,
                    );
                }
                refreshDom();
                return;
            }
        },
        { signal },
    );
    root.addEventListener(
        "change",
        async (event) => {
            if (!(event.target instanceof Element)) return;
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
                        `/api/v1/study/classes/${encodeURIComponent(selectedClassId)}/agenda`,
                        {
                            method: "PUT",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({ document: documentText }),
                        },
                    );
                    await loadSelectedClassMeta();
                    refreshDom();
                }, 450);
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
