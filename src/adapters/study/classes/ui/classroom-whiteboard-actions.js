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
        apiFetch,
        i18n,
        showToast,
        openPopup,
        escapeHtml,
        classroomWindows,
        isTeacherView,
        loadSelectedClassMeta,
        refreshDom,
        isMeetingOpen,
        getClassroomNotepad,
        setClassroomNotepad,
        getClassroomNotepadClassId,
        setClassroomNotepadClassId,
        createClassroomNotepad,
        getActiveWhiteboard,
        getActiveWhiteboardId,
        persistActiveWhiteboardId,
        setActiveWhiteboard,
        setWorkspaceMode,
    },
) {
    if (!(event.target instanceof Element)) return false;

    function ensureNotepad() {
        if (!snapshot) return null;
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

    async function resolveWhiteboardEmbed(boardId, boardName) {
        if (!snapshot) return null;
        const tokenResponse = await apiFetch(
            `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/whiteboards/${encodeURIComponent(boardId)}/token`,
        );
        if (!tokenResponse.ok) {
            const errPayload = await tokenResponse.json().catch(() => null);
            const code = String(errPayload?.error?.code ?? "");
            showToast(
                i18n.t(
                    code === "not_configured"
                        ? "module.study.classes.whiteboard_not_configured"
                        : "module.study.classes.whiteboard_open_failed",
                ),
                { variant: "error" },
            );
            return null;
        }
        const tokenPayload = await tokenResponse
            .json()
            .catch(() => ({ data: {} }));
        return {
            boardId,
            boardName,
            embedUrl: String(tokenPayload?.data?.embedUrl ?? "").trim(),
        };
    }

    if (event.target.closest(".classes-toggle-notepad-btn")) {
        if (!snapshot || isMeetingOpen()) return false;
        ensureNotepad();
        setWorkspaceMode("notepad");
        refreshDom();
        return true;
    }

    if (event.target.closest(".classes-open-whiteboards-btn")) {
        if (!snapshot || isMeetingOpen()) return false;
        if (!isTeacherView() && !getActiveWhiteboardId()) {
            return true;
        }
        if (isTeacherView()) {
            const activeWhiteboardId = getActiveWhiteboardId();
            if (!activeWhiteboardId) {
                const autoName = i18n.t("module.study.classes.whiteboard");
                const createResponse = await apiFetch(
                    `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/whiteboards`,
                    {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ name: autoName }),
                    },
                );
                if (!createResponse.ok) {
                    showToast(
                        i18n.t("module.study.classes.whiteboard_create_failed"),
                        { variant: "error" },
                    );
                    return true;
                }
                const createPayload = await createResponse
                    .json()
                    .catch(() => ({ data: {} }));
                const newBoardId = String(createPayload?.data?.id ?? "").trim();
                if (!newBoardId) {
                    await loadSelectedClassMeta();
                } else {
                    const embed = await resolveWhiteboardEmbed(
                        newBoardId,
                        autoName,
                    );
                    if (embed?.embedUrl) {
                        setActiveWhiteboard(embed);
                        await persistActiveWhiteboardId(
                            snapshot.id,
                            newBoardId,
                        );
                    }
                    await loadSelectedClassMeta();
                }
            } else {
                const currentActive = getActiveWhiteboard();
                if (!currentActive?.embedUrl) {
                    const embed = await resolveWhiteboardEmbed(
                        activeWhiteboardId,
                        "",
                    );
                    if (embed?.embedUrl) {
                        setActiveWhiteboard(embed);
                    }
                }
            }
        }
        setWorkspaceMode("whiteboard");
        refreshDom();
        return true;
    }

    if (event.target.closest(".classes-inline-whiteboard-close-btn")) {
        if (snapshot && isTeacherView()) {
            await persistActiveWhiteboardId(snapshot.id, null);
        }
        setActiveWhiteboard(null);
        refreshDom();
        return true;
    }

    if (event.target.closest(".classes-inline-whiteboard-popout-btn")) {
        const activeWhiteboard = getActiveWhiteboard();
        if (!activeWhiteboard || !classroomWindows || !snapshot) return true;
        classroomWindows.openWhiteboard({
            classId: snapshot.id,
            boardId: activeWhiteboard.boardId,
            boardName: activeWhiteboard.boardName,
            embedUrl: activeWhiteboard.embedUrl,
        });
        if (isTeacherView()) {
            await persistActiveWhiteboardId(
                snapshot.id,
                activeWhiteboard.boardId,
            );
        }
        return true;
    }

    if (event.target.closest(".classes-open-whiteboard-btn")) {
        if (!snapshot || isMeetingOpen()) return false;
        const button = event.target.closest(".classes-open-whiteboard-btn");
        const boardId = String(button?.dataset?.boardId ?? "").trim();
        const boardName = String(button?.dataset?.boardName ?? "").trim();
        if (!boardId) return true;
        const embed = await resolveWhiteboardEmbed(boardId, boardName);
        if (!embed?.embedUrl) return true;
        setActiveWhiteboard(embed);
        if (isTeacherView()) {
            await persistActiveWhiteboardId(snapshot.id, boardId);
        }
        setWorkspaceMode("whiteboard");
        refreshDom();
        return true;
    }

    if (event.target.closest(".classes-popout-whiteboard-btn")) {
        if (!snapshot || !classroomWindows) return true;
        const button = event.target.closest(".classes-popout-whiteboard-btn");
        const boardId = String(button?.dataset?.boardId ?? "").trim();
        const boardName = String(button?.dataset?.boardName ?? "").trim();
        if (!boardId) return true;
        const embed = await resolveWhiteboardEmbed(boardId, boardName);
        if (!embed?.embedUrl) return true;
        classroomWindows.openWhiteboard({
            classId: snapshot.id,
            ...embed,
        });
        if (isTeacherView()) {
            await persistActiveWhiteboardId(snapshot.id, boardId);
        }
        return true;
    }

    const deleteWhiteboardButton = event.target.closest(
        ".classes-delete-whiteboard-btn",
    );
    if (deleteWhiteboardButton instanceof HTMLElement && isTeacherView()) {
        if (!snapshot) return true;
        const boardId = String(
            deleteWhiteboardButton.dataset.boardId ?? "",
        ).trim();
        const boardName = String(
            deleteWhiteboardButton.dataset.boardName ?? "",
        ).trim();
        if (!boardId) return true;
        const result = await openPopup({
            title: i18n.t("module.study.classes.delete_whiteboard_title"),
            body: `<p>${escapeHtml(i18n.t("module.study.classes.delete_whiteboard_confirm").replace("{name}", boardName))}</p>`,
            actions: [
                {
                    id: "delete",
                    label: i18n.t("ui.reuse.delete"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
            ],
        });
        if (result !== "delete") return true;
        if (
            classroomWindows?.isWhiteboardOpen() &&
            classroomWindows.getActiveWhiteboardId() === boardId
        ) {
            classroomWindows.closeWhiteboard();
        }
        const activeWhiteboard = getActiveWhiteboard();
        if (activeWhiteboard?.boardId === boardId) {
            setActiveWhiteboard(null);
        }
        await persistActiveWhiteboardId(snapshot.id, null);
        const deleteResponse = await apiFetch(
            `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/whiteboards/${encodeURIComponent(boardId)}`,
            { method: "DELETE" },
        );
        showToast(
            i18n.t(
                deleteResponse.ok
                    ? "module.study.classes.whiteboard_deleted"
                    : "module.study.classes.whiteboard_delete_failed",
            ),
            { variant: deleteResponse.ok ? "success" : "error" },
        );
        if (deleteResponse.ok) {
            await loadSelectedClassMeta();
            refreshDom();
        }
        return true;
    }

    return false;
}
