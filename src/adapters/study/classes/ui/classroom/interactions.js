import { bindClassroomEnhancements } from "/static/adapters/study/classes/classroom-enhancements.js";
import { TOOLBAR_ACTIONS } from "/static/adapters/study/classes/classroom-agenda-toolbar.js";

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
}) {
    if (getInteractionsBound()) {
        return;
    }
    setInteractionsBound(true);
    bindProfilePreviews(i18n);
    let agendaAutosaveTimer = null;

    function shouldBlockStudentInteraction() {
        return !isTeacherView() && getIsTeacherPresent?.();
    }

    root.addEventListener(
        "click",
        async (event) => {
            if (!(event.target instanceof Element)) return;
            const snapshot = selectedSnapshot();
            const classroomWindows = getClassroomWindows();
            const selectedClassId = getSelectedClassId();
            const activeWhiteboard = getActiveWhiteboard();

            const toolbarBtn = event.target.closest(
                ".classes-agenda-toolbar-btn",
            );
            if (toolbarBtn instanceof HTMLElement && isTeacherView()) {
                const action = String(toolbarBtn.dataset.toolbarAction ?? "");
                const handler = TOOLBAR_ACTIONS[action];
                const editor = root.querySelector(
                    ".classes-agenda-document-editor",
                );
                if (handler && editor instanceof HTMLTextAreaElement) {
                    const start = editor.selectionStart;
                    const end = editor.selectionEnd;
                    const selected = editor.value.slice(start, end);
                    const before = editor.value.slice(0, start);
                    const after = editor.value.slice(end);
                    let insertion;
                    if (handler.template) {
                        insertion = handler.template(selected);
                    } else if (handler.prefix) {
                        insertion = handler.prefix + selected;
                    } else {
                        insertion = handler.before + selected + handler.after;
                    }
                    editor.value = before + insertion + after;
                    const cursorPos = handler.template
                        ? start + insertion.length
                        : handler.prefix
                          ? start + handler.prefix.length + selected.length
                          : start + handler.before.length + selected.length;
                    editor.setSelectionRange(cursorPos, cursorPos);
                    editor.focus();
                    editor.dispatchEvent(new Event("input", { bubbles: true }));
                }
                return;
            }
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

            const tileLayoutToggle = event.target.closest(
                ".classes-tile-layout-toggle-btn",
            );
            if (tileLayoutToggle instanceof HTMLElement) {
                const currentLayout = getTileLayout();
                setTileLayout(
                    currentLayout === "stacked" ? "slideshow" : "stacked",
                );
                if (classroomWindows?.isMeetingOpen()) {
                    refreshWorkspaceTilesOnly();
                } else {
                    refreshDom();
                }
                return;
            }

            const slideshowNavButton = event.target.closest(
                ".classes-tile-nav-prev, .classes-tile-nav-next",
            );
            if (slideshowNavButton instanceof HTMLElement) {
                if (shouldBlockStudentInteraction()) return;
                const isPrev = slideshowNavButton.classList.contains(
                    "classes-tile-nav-prev",
                );
                const currentOrder = getTileOrder();
                const currentMode = normalizeWorkspaceMode(
                    root.querySelector(".classes-workspace-tiles")?.dataset
                        .activeWorkspaceMode ?? "agenda",
                );
                const currentIndex = currentOrder.indexOf(currentMode);
                const nextIndex = isPrev
                    ? (currentIndex - 1 + currentOrder.length) %
                      currentOrder.length
                    : (currentIndex + 1) % currentOrder.length;
                const nextMode = normalizeWorkspaceMode(
                    currentOrder[nextIndex] ?? "agenda",
                );
                setWorkspaceMode(nextMode);
                setBlackboardExpanded(true);
                if (classroomWindows?.isMeetingOpen()) {
                    refreshWorkspaceTilesOnly();
                } else {
                    refreshDom();
                }
                return;
            }

            const workspaceButton = event.target.closest(
                ".classes-workspace-tab-btn[data-workspace-mode], .classes-workspace-tile-hitbox[data-workspace-mode]",
            );
            if (workspaceButton instanceof HTMLElement) {
                if (shouldBlockStudentInteraction()) return;
                const nextWorkspaceMode = normalizeWorkspaceMode(
                    workspaceButton.dataset.workspaceMode,
                );
                const tileHitbox = event.target.closest(
                    ".classes-workspace-tile-hitbox[data-workspace-mode]",
                );
                if (
                    tileHitbox instanceof HTMLElement &&
                    getTileLayout() === "stacked"
                ) {
                    const currentOrder = getTileOrder();
                    const clickedMode = normalizeWorkspaceMode(
                        tileHitbox.dataset.workspaceMode,
                    );
                    const clickedIndex = currentOrder.indexOf(clickedMode);
                    if (clickedIndex > 0) {
                        setTileOrder([
                            clickedMode,
                            ...currentOrder.filter(
                                (mode) => mode !== clickedMode,
                            ),
                        ]);
                    }
                }
                if (nextWorkspaceMode === "meeting") {
                    if (classroomWindows?.isMeetingOpen()) {
                        setWorkspaceMode("meeting", {
                            remember: false,
                        });
                        setBlackboardExpanded(true);
                        refreshWorkspaceTilesOnly();
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
                        setWorkspaceMode("agenda");
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
                    if (isTeacherView()) {
                        await updateBoardFocus(nextWorkspaceMode);
                    }
                    setWorkspaceMode(nextWorkspaceMode);
                }
                setBlackboardExpanded(true);
                if (classroomWindows?.isMeetingOpen()) {
                    refreshWorkspaceTilesOnly();
                } else {
                    refreshDom();
                }
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

            if (event.target.closest(".classes-agenda-edit-btn")) {
                if (!isTeacherView() || !selectedClassId) return;
                const classResources = getClassResources();
                const snapshots = Array.isArray(classResources?.agendaSnapshots)
                    ? classResources.agendaSnapshots
                    : [];
                openPopup({
                    title: i18n.t("module.study.classes.agenda_edit_snapshots"),
                    content: snapshots.length
                        ? `<ul class="classes-agenda-edit-list">${snapshots
                              .map(
                                  (snap) =>
                                      `<li class="classes-agenda-edit-item" data-snapshot-id="${escapeHtml(String(snap?.id ?? ""))}">
                                        <span class="classes-agenda-edit-name">${escapeHtml(String(snap?.name ?? snap?.id ?? ""))}</span>
                                        <button type="button" class="classes-agenda-edit-rename-btn" data-snapshot-id="${escapeHtml(String(snap?.id ?? ""))}">${escapeHtml(i18n.t("module.study.classes.agenda_snapshot_rename"))}</button>
                                        <button type="button" class="classes-agenda-edit-delete-btn" data-snapshot-id="${escapeHtml(String(snap?.id ?? ""))}">${escapeHtml(i18n.t("module.study.classes.agenda_snapshot_delete"))}</button>
                                      </li>`,
                              )
                              .join("")}</ul>`
                        : `<p class="classes-agenda-edit-empty">${escapeHtml(i18n.t("module.study.classes.agenda_no_snapshots"))}</p>`,
                    onMount: (overlay) => {
                        overlay.addEventListener(
                            "click",
                            async (popupEvent) => {
                                const renameBtn =
                                    popupEvent.target instanceof Element
                                        ? popupEvent.target.closest(
                                              ".classes-agenda-edit-rename-btn",
                                          )
                                        : null;
                                if (renameBtn instanceof HTMLElement) {
                                    const snapshotId = String(
                                        renameBtn.dataset.snapshotId ?? "",
                                    ).trim();
                                    if (!snapshotId) return;
                                    const item = overlay.querySelector(
                                        `.classes-agenda-edit-item[data-snapshot-id="${CSS.escape(snapshotId)}"]`,
                                    );
                                    const nameSpan = item
                                        ? item.querySelector(
                                              ".classes-agenda-edit-name",
                                          )
                                        : null;
                                    if (
                                        !item ||
                                        !(nameSpan instanceof HTMLElement)
                                    )
                                        return;
                                    const input =
                                        document.createElement("input");
                                    input.type = "text";
                                    input.value = nameSpan.textContent ?? "";
                                    input.className =
                                        "classes-agenda-edit-name-input";
                                    nameSpan.replaceWith(input);
                                    input.focus();
                                    input.select();
                                    input.addEventListener(
                                        "keydown",
                                        async (keyEvent) => {
                                            if (keyEvent.key !== "Enter")
                                                return;
                                            const newName = input.value.trim();
                                            if (!newName) return;
                                            const patchResponse =
                                                await apiFetch(
                                                    `/api/v1/study/classes/${encodeURIComponent(selectedClassId)}/agenda/snapshots/${encodeURIComponent(snapshotId)}`,
                                                    {
                                                        method: "PATCH",
                                                        headers: {
                                                            "content-type":
                                                                "application/json",
                                                        },
                                                        body: JSON.stringify({
                                                            name: newName,
                                                        }),
                                                    },
                                                );
                                            if (patchResponse.ok) {
                                                const newSpan =
                                                    document.createElement(
                                                        "span",
                                                    );
                                                newSpan.className =
                                                    "classes-agenda-edit-name";
                                                newSpan.textContent = newName;
                                                input.replaceWith(newSpan);
                                                await loadSelectedClassMeta();
                                                refreshDom();
                                            } else {
                                                showToast(
                                                    i18n.t(
                                                        "module.study.classes.agenda_snapshot_rename_error",
                                                    ),
                                                    { variant: "error" },
                                                );
                                            }
                                        },
                                    );
                                    return;
                                }

                                const deleteBtn =
                                    popupEvent.target instanceof Element
                                        ? popupEvent.target.closest(
                                              ".classes-agenda-edit-delete-btn",
                                          )
                                        : null;
                                if (deleteBtn instanceof HTMLElement) {
                                    const snapshotId = String(
                                        deleteBtn.dataset.snapshotId ?? "",
                                    ).trim();
                                    if (!snapshotId) return;
                                    const deleteResponse = await apiFetch(
                                        `/api/v1/study/classes/${encodeURIComponent(selectedClassId)}/agenda/snapshots/${encodeURIComponent(snapshotId)}`,
                                        { method: "DELETE" },
                                    );
                                    if (deleteResponse.ok) {
                                        const item = overlay.querySelector(
                                            `.classes-agenda-edit-item[data-snapshot-id="${CSS.escape(snapshotId)}"]`,
                                        );
                                        item?.remove();
                                        await loadSelectedClassMeta();
                                        refreshDom();
                                    } else {
                                        showToast(
                                            i18n.t(
                                                "module.study.classes.agenda_snapshot_delete_error",
                                            ),
                                            { variant: "error" },
                                        );
                                    }
                                }
                            },
                        );
                    },
                });
                return;
            }

            if (event.target.closest(".classes-agenda-new-btn")) {
                if (!isTeacherView() || !selectedClassId) return;
                const editor = root.querySelector(
                    ".classes-agenda-document-editor",
                );
                if (!(editor instanceof HTMLTextAreaElement)) return;
                editor.value = "";
                await apiFetch(
                    `/api/v1/study/classes/${encodeURIComponent(selectedClassId)}/agenda`,
                    {
                        method: "PUT",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ document: "" }),
                    },
                );
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
                if (
                    getTeacherAccount() &&
                    getClassroomViewMode() !== "teacher"
                ) {
                    setClassroomViewMode("teacher");
                }
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
                        `/api/v1/study/classes/${encodeURIComponent(selectedClassId)}/agenda`,
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
            if (getIsTeacherPresent?.()) return;
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
