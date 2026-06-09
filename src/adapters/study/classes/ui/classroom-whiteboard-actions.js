/**
 * Handles whiteboard open/create/delete and notepad-toggle click interactions
 * in the classroom. Returns true if the event was handled.
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
        getNotepadVisible,
        setNotepadVisible,
        getClassroomNotepad,
        setClassroomNotepad,
        createClassroomNotepad,
        root,
    },
) {
    if (!(event.target instanceof Element)) return false;

    if (event.target.closest(".classes-toggle-notepad-btn")) {
        if (!snapshot) return true;
        const visible = !getNotepadVisible();
        setNotepadVisible(visible);
        let notepad = getClassroomNotepad();
        if (!notepad) {
            notepad = createClassroomNotepad({
                classId: snapshot.id,
                i18n,
            });
            setClassroomNotepad(notepad);
        }
        const blackboard = root.querySelector(".classes-blackboard");
        if (!blackboard) return true;
        const existing = blackboard.querySelector(".classes-notepad-panel");
        if (visible) {
            if (!existing) {
                blackboard.appendChild(notepad.getElement());
            } else {
                existing.hidden = false;
            }
            notepad.focus();
        } else if (existing) {
            existing.hidden = true;
        }
        return true;
    }

    if (event.target.closest(".classes-open-whiteboard-btn")) {
        if (!snapshot || !classroomWindows) return true;
        const btn = event.target.closest(".classes-open-whiteboard-btn");
        const boardId = String(btn?.dataset?.boardId ?? "").trim();
        const boardName = String(btn?.dataset?.boardName ?? "").trim();
        if (!boardId) return true;
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
            return true;
        }
        const tokenPayload = await tokenResponse.json();
        classroomWindows.openWhiteboard({
            boardId,
            boardName,
            embedUrl: tokenPayload?.data?.embedUrl ?? "",
        });
        return true;
    }

    if (
        event.target.closest(".classes-create-whiteboard-btn") &&
        isTeacherView()
    ) {
        if (!snapshot) return true;
        const result = await openPopup({
            title: i18n.t("module.study.classes.new_whiteboard"),
            body: `<label>${escapeHtml(i18n.t("module.study.classes.whiteboard_name_label"))}<input type="text" class="classes-whiteboard-name-input" /></label>`,
            actions: [
                {
                    id: "create",
                    label: i18n.t("ui.reuse.create"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
            ],
        });
        if (result !== "create") return true;
        const nameInput = document.querySelector(
            ".classes-whiteboard-name-input",
        );
        const name =
            nameInput instanceof HTMLInputElement ? nameInput.value.trim() : "";
        const createResponse = await apiFetch(
            `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/whiteboards`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    name: name || i18n.t("module.study.classes.whiteboard"),
                }),
            },
        );
        showToast(
            i18n.t(
                createResponse.ok
                    ? "module.study.classes.whiteboard_created"
                    : "module.study.classes.whiteboard_create_failed",
            ),
            { variant: createResponse.ok ? "success" : "error" },
        );
        if (createResponse.ok) {
            await loadSelectedClassMeta();
            refreshDom();
        }
        return true;
    }

    const deleteWhiteboardBtn = event.target.closest(
        ".classes-delete-whiteboard-btn",
    );
    if (deleteWhiteboardBtn instanceof HTMLElement && isTeacherView()) {
        if (!snapshot) return true;
        const boardId = String(
            deleteWhiteboardBtn.dataset.boardId ?? "",
        ).trim();
        const boardName = String(
            deleteWhiteboardBtn.dataset.boardName ?? "",
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
