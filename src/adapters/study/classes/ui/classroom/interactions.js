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
    isTeacherView,
    getClassroomWindows,
    updateBoardFocus,
    normalizeWorkspaceMode,
    setWorkspaceMode,
    handleSeatActionMenu,
    openAgendaPopup,
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
    getClassResources,
    loadSelectedClassMeta,
    getClassroomNotepad,
    setClassroomNotepad,
    getClassroomNotepadClassId,
    setClassroomNotepadClassId,
    createClassroomNotepad,
    persistActiveWhiteboardId,
    loadAvailableClasses,
    setSelectedLanguageFilter,
    setSearchQuery,
    setNotebookText,
    setBoardEntity,
}) {
    if (getInteractionsBound()) {
        return;
    }
    setInteractionsBound(true);
    bindProfilePreviews(i18n);
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

            const workspaceButton = event.target.closest(
                ".classes-workspace-tab-btn[data-workspace-mode]",
            );
            if (workspaceButton instanceof HTMLElement) {
                if (classroomWindows?.isMeetingOpen()) {
                    return;
                }
                const nextWorkspaceMode = normalizeWorkspaceMode(
                    workspaceButton.dataset.workspaceMode,
                );
                if (
                    nextWorkspaceMode === "agenda" ||
                    nextWorkspaceMode === "roster"
                ) {
                    if (isTeacherView()) {
                        await updateBoardFocus(
                            nextWorkspaceMode === "roster"
                                ? "classroom"
                                : "agenda",
                        );
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
                refreshDom();
                return;
            }

            const seatButton = event.target.closest(".classes-desk-unit");
            if (seatButton instanceof HTMLElement) {
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
                classroomWindows.openChat(snapshot.chatUrl);
                refreshDom();
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
                refreshDom();
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

            if (event.target.closest(".classes-create-agenda-btn")) {
                await openAgendaPopup({
                    i18n,
                    openPopup,
                    apiFetch,
                    selectedClassId,
                    showToast,
                    onSaved: async () => {
                        await loadSelectedClassMeta();
                        refreshDom();
                    },
                });
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
                const nextUrl = new URL(
                    window.location.href,
                    window.location.origin,
                );
                if (nextMode === "student") {
                    nextUrl.searchParams.set("student", "true");
                } else {
                    nextUrl.searchParams.delete("student");
                }
                navigateTo(nextUrl.pathname + nextUrl.search);
                return;
            }

            const subnavFindButton = event.target.closest(
                ".classes-subnav-find-btn",
            );
            if (subnavFindButton instanceof HTMLElement) {
                openClassSearch();
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
                    isMeetingOpen: () =>
                        classroomWindows?.isMeetingOpen() ?? false,
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
                !(event.target instanceof HTMLInputElement) ||
                !event.target.classList.contains("classes-available-search")
            ) {
                return;
            }
            setSearchQuery(event.target.value.trim());
            await loadAvailableClasses();
            refreshDom();
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
