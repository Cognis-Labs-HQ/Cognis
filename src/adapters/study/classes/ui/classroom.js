import { apiFetch } from "/static/reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { openSearchPopup } from "/static/reuse/search-bar.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { bindProfilePreviews } from "/static/reuse/profile-preview.js";
import {
    handleProfileAvatarError,
    hydrateProfileAvatars,
} from "/static/gateways/social/reuse/profile-avatar.js";
import {
    loadFooterClasses,
    createClassFooterItem,
} from "/static/adapters/study/classes/study-footer.js";
import {
    applyClassroomViewModeFromUrl,
    canToggleClassroomView,
    getClassroomViewMode,
} from "/static/adapters/study/classes/view-mode.js";
import { renderClassroomPage } from "/static/adapters/study/classes/classroom-render.js";
import { handleClassroomExit } from "/static/adapters/study/classes/classroom-exit.js";
import { createClassroomPresenceController } from "/static/adapters/study/classes/classroom-presence.js";
import { bindClassroomEnhancements } from "/static/adapters/study/classes/classroom-enhancements.js";
import { openClassSettingsPopup } from "/static/adapters/study/classes/classroom-popups.js";
import { openAgendaPopup } from "/static/adapters/study/classes/classroom-agenda-popup.js";
import { renderClassroomSubNavigation } from "/static/adapters/study/classes/classroom-sub-navigation.js";
import { startClassroomRealtimeRefresh } from "/static/adapters/study/classes/classroom-realtime.js";
import { createClassroomWindows } from "/static/adapters/study/classes/classroom-windows.js";
import { createDynamicDomRefresher } from "/static/adapters/study/classes/classroom-dynamic-refresh.js";
import { createBoardEntityStore } from "/static/adapters/study/classes/classroom-board.js";
import { openSeatActionMenu } from "/static/adapters/study/classes/classroom-seat-menu.js";
import { createClassroomNotepad } from "/static/adapters/study/classes/classroom-notepad.js";

function buildQuery(params) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value == null || value === "") continue;
        query.set(key, String(value));
    }
    return query.toString();
}

function normalizeBoardFocus(input) {
    return String(input ?? "")
        .trim()
        .toLowerCase() === "classroom"
        ? "classroom"
        : "agenda";
}

export async function mount(root, { signal } = {}) {
    applyClassroomViewModeFromUrl();
    const i18n = await createI18n();
    applyDocumentTitle(i18n, "module.study.classes.classroom_page_title");

    if (!canToggleClassroomView()) {
        try {
            const accountId = localStorage.getItem("cognis_account");
            if (accountId) {
                const infoResponse = await apiFetch(
                    `/api/v1/users/${encodeURIComponent(accountId)}/info`,
                );
                if (infoResponse.ok) {
                    const infoPayload = await infoResponse.json();
                    const refreshedRole = String(
                        infoPayload?.data?.role ?? "",
                    ).trim();
                    if (refreshedRole) {
                        localStorage.setItem("cognis_role", refreshedRole);
                        applyClassroomViewModeFromUrl();
                    }
                }
            }
        } catch {
            // Keep existing role when refresh fails.
        }
    }

    const teacherAccount = canToggleClassroomView();
    const query = new URL(window.location.href).searchParams;

    let classroomSnapshots = [];
    let availableClasses = [];
    let footerClasses = [];
    let selectedClassId = String(query.get("classId") ?? "").trim();
    let selectedSeatNumber = null;
    let selectedNotebookText = "";
    let classResources = { materials: "", homework: "" };
    let activeAgendaItems = [];
    let selectedLanguageFilter = "";
    let searchQuery = "";
    let activeBoardPanel = "agenda";
    const presenceByAccountId = new Map();
    const boardEntityStore = createBoardEntityStore();
    let interactionsBound = false;
    /** Initialised after composer.init(); used by the click handler via closure. */
    let classroomWindows = null;
    let classroomNotepad = null;
    let notepadVisible = false;
    let whiteboards = [];

    function isTeacherView() {
        return teacherAccount && getClassroomViewMode() === "teacher";
    }

    function selectedSnapshot() {
        return (
            classroomSnapshots.find(
                (snapshot) => snapshot.id === selectedClassId,
            ) ?? null
        );
    }

    function syncActiveBoardPanelWithSnapshot() {
        const snapshot = selectedSnapshot();
        activeBoardPanel = snapshot
            ? normalizeBoardFocus(snapshot?.classroom?.boardFocus)
            : "agenda";
    }

    function getBoardEntities(snapshot) {
        return boardEntityStore.get(snapshot);
    }

    function setBoardEntity(classId, kind, x, y) {
        boardEntityStore.set(classId, kind, x, y);
    }

    async function loadClassrooms() {
        const queryString = buildQuery({
            student: teacherAccount && !isTeacherView() ? "true" : "",
        });
        const response = await apiFetch(
            `/api/v1/study/classrooms?${queryString}`,
        );
        if (!response.ok) {
            throw new Error("load_failed");
        }
        const payload = await response.json();
        classroomSnapshots = Array.isArray(payload?.data) ? payload.data : [];
        for (const snapshot of classroomSnapshots) {
            const members = Array.isArray(snapshot?.members)
                ? snapshot.members
                : [];
            for (const member of members) {
                const accountId = String(member?.studentAccountId ?? "").trim();
                const presence = String(member?.presence ?? "").trim();
                if (!accountId || !presence) continue;
                presenceByAccountId.set(accountId, presence);
            }
        }
        if (
            !selectedClassId ||
            !classroomSnapshots.some(
                (snapshot) => snapshot.id === selectedClassId,
            )
        ) {
            selectedClassId = String(classroomSnapshots[0]?.id ?? "");
            selectedSeatNumber = null;
        }
        syncActiveBoardPanelWithSnapshot();
    }

    async function loadAvailableClasses() {
        if (isTeacherView()) {
            availableClasses = [];
            return;
        }
        const queryString = buildQuery({
            language: selectedLanguageFilter,
            search: searchQuery,
        });
        const response = await apiFetch(
            `/api/v1/study/available-classes${queryString ? `?${queryString}` : ""}`,
        );
        if (!response.ok) {
            availableClasses = [];
            return;
        }
        const payload = await response.json();
        availableClasses = Array.isArray(payload?.data) ? payload.data : [];
    }

    async function loadSelectedClassMeta() {
        const snapshot = selectedSnapshot();
        if (!snapshot) {
            selectedNotebookText = "";
            classResources = { materials: "", homework: "" };
            activeAgendaItems = [];
            whiteboards = [];
            return;
        }
        const [
            resourcesResponse,
            notebookResponse,
            agendaResponse,
            whiteboardsResponse,
        ] = await Promise.all([
            apiFetch(
                `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/resources`,
            ),
            apiFetch(
                `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/notebook`,
            ),
            apiFetch(
                `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/agenda`,
            ),
            apiFetch(
                `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/whiteboards`,
            ),
        ]);
        classResources = resourcesResponse.ok
            ? ((await resourcesResponse.json())?.data ?? {
                  materials: "",
                  homework: "",
              })
            : { materials: "", homework: "" };
        selectedNotebookText = notebookResponse.ok
            ? String((await notebookResponse.json())?.data?.noteText ?? "")
            : "";
        activeAgendaItems = agendaResponse.ok
            ? ((await agendaResponse.json())?.data?.activeItems ?? [])
            : [];
        whiteboards = whiteboardsResponse.ok
            ? ((await whiteboardsResponse.json())?.data ?? [])
            : [];
    }

    async function refreshData() {
        await Promise.all([loadClassrooms(), loadAvailableClasses()]);
        await loadSelectedClassMeta();
    }

    async function updateBoardFocus(nextFocus) {
        const snapshot = selectedSnapshot();
        if (!snapshot || !isTeacherView()) return;
        const normalizedFocus = normalizeBoardFocus(nextFocus);
        const response = await apiFetch(
            `/api/v1/study/classrooms/${encodeURIComponent(snapshot.id)}/layout`,
            {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ boardFocus: normalizedFocus }),
            },
        );
        if (!response.ok) return;
        const payload = await response.json().catch(() => null);
        const nextState = payload?.data;
        if (nextState) {
            snapshot.classroom = {
                ...(snapshot.classroom ?? {}),
                ...nextState,
            };
        } else if (snapshot.classroom) {
            snapshot.classroom.boardFocus = normalizedFocus;
        }
        activeBoardPanel = normalizedFocus;
    }

    function renderSubNavigationMarkup() {
        return renderClassroomSubNavigation({
            i18n,
            classes: footerClasses,
            selectedClassId,
        });
    }

    function refreshSubNavigation() {
        const subNav = root.querySelector(".page-subnav");
        if (subNav instanceof HTMLElement) {
            subNav.innerHTML = renderSubNavigationMarkup();
        }
    }

    function openClassSearch() {
        const nextUrl = new URL("/classroom", window.location.origin);
        if (teacherAccount) {
            nextUrl.searchParams.set("student", "true");
        }
        navigateTo(nextUrl.pathname + nextUrl.search);
    }

    async function handleSeatActionMenu(button) {
        await openSeatActionMenu({
            button,
            getSelectedClassId: () => selectedClassId,
            apiFetch,
            i18n,
            openSearchPopup,
            openPopup,
            escapeHtml,
            showToast,
            navigateTo,
            refreshContent,
        });
    }

    function renderContentMarkup() {
        const snapshot = selectedSnapshot();
        return renderClassroomPage({
            snapshot,
            classResources,
            activeAgendaItems,
            selectedSeatNumber,
            selectedNotebookText,
            i18n,
            isTeacherView: isTeacherView(),
            availableClasses,
            selectedLanguageFilter,
            searchQuery,
            canToggleView: teacherAccount,
            currentViewMode: getClassroomViewMode(),
            canEditMaterials: teacherAccount,
            boardEntities: getBoardEntities(snapshot),
            activeBoardPanel,
            whiteboards,
        });
    }

    function refreshDom() {
        const content = root.querySelector(".classes-classroom-content");
        if (content instanceof HTMLElement) {
            classroomWindows?.hoist();
            content.outerHTML = renderContentMarkup();
            void hydrateProfileAvatars(root);
            classroomWindows?.reattach();
        }
    }

    const refreshDynamicDom = createDynamicDomRefresher({
        root,
        selectedSnapshot,
        getSelectedSeatNumber: () => selectedSeatNumber,
        i18n,
        isTeacherView,
        getActiveBoardPanel: () => activeBoardPanel,
    });

    async function refreshContent() {
        await refreshData();
        refreshSnapshotPresence();
        footerClasses = await loadFooterClasses();
        refreshDom();
        composer.refreshFooter();
        refreshSubNavigation();
    }

    function refreshSnapshotPresence() {
        classroomSnapshots = classroomSnapshots.map((snapshot) => ({
            ...snapshot,
            members: Array.isArray(snapshot?.members)
                ? snapshot.members.map((member) => {
                      const accountId = String(
                          member?.studentAccountId ?? "",
                      ).trim();
                      return {
                          ...member,
                          presence:
                              presenceByAccountId.get(accountId) ??
                              member?.presence ??
                              "offline",
                      };
                  })
                : [],
        }));
    }

    footerClasses = await loadFooterClasses();
    await refreshData();
    refreshSnapshotPresence();
    const presenceController = createClassroomPresenceController({
        apiFetch,
        signal,
        onPresence: (accountId, status) => {
            presenceByAccountId.set(accountId, status);
            refreshSnapshotPresence();
            refreshDynamicDom();
        },
    });
    await presenceController.init();

    const footerItem = createClassFooterItem({
        i18n,
        signal,
        getClasses: () => footerClasses,
        getSelectedClassId: () => selectedClassId,
        allowCreateOption: false,
        onSelectClass: async (classId) => {
            selectedClassId = classId;
            selectedSeatNumber = null;
            syncActiveBoardPanelWithSnapshot();
            await loadSelectedClassMeta();
            refreshDom();
        },
    });

    const composer = createPageComposer(root, {
        allowCustomization: false,
        elements: [
            {
                id: "classroom-page",
                title: i18n.t("module.study.classes.classroom_page_title"),
                gridSize: { default: [8, 6], min: [2, 2], max: "full" },
                render: renderContentMarkup,
                onRender() {
                    if (interactionsBound) return;
                    interactionsBound = true;
                    bindProfilePreviews(i18n);
                    root.addEventListener(
                        "click",
                        async (event) => {
                            if (!(event.target instanceof Element)) return;
                            const snapshot = selectedSnapshot();
                            const profileButton = event.target.closest(
                                ".classes-member-profile-btn",
                            );
                            if (profileButton instanceof HTMLElement) {
                                const handle = String(
                                    profileButton.dataset.studentHandle ?? "",
                                ).trim();
                                if (handle) {
                                    navigateTo(
                                        `/profile/${encodeURIComponent(handle)}`,
                                    );
                                }
                                return;
                            }

                            const boardPanelButton = event.target.closest(
                                ".classes-board-panel-btn[data-board-panel]",
                            );
                            if (boardPanelButton instanceof HTMLElement) {
                                if (!isTeacherView()) return;
                                const nextBoardPanel =
                                    boardPanelButton.dataset.boardPanel ===
                                    "classroom"
                                        ? "classroom"
                                        : "agenda";
                                await updateBoardFocus(nextBoardPanel);
                                refreshDom();
                                return;
                            }

                            const seatButton =
                                event.target.closest(".classes-desk-unit");
                            if (seatButton instanceof HTMLElement) {
                                if (
                                    !Number.isInteger(
                                        Number(
                                            seatButton.dataset.seatNumber ?? "",
                                        ),
                                    )
                                ) {
                                    return;
                                }
                                selectedSeatNumber = Number(
                                    seatButton.dataset.seatNumber ?? "-1",
                                );
                                if (isTeacherView()) {
                                    await handleSeatActionMenu(seatButton);
                                } else {
                                    refreshDom();
                                }
                                return;
                            }

                            if (
                                event.target.closest(".classes-open-chat-btn")
                            ) {
                                if (!snapshot?.chatUrl || !classroomWindows) {
                                    showToast(
                                        i18n.t(
                                            "module.study.classes.chat_failed",
                                        ),
                                        {
                                            variant: "error",
                                        },
                                    );
                                    return;
                                }
                                classroomWindows.openChat(snapshot.chatUrl);
                                return;
                            }
                            if (
                                event.target.closest(
                                    ".classes-open-meeting-btn",
                                ) &&
                                snapshot
                            ) {
                                if (isTeacherView()) {
                                    await classroomWindows.openMeeting(
                                        snapshot,
                                    );
                                } else {
                                    await classroomWindows.tryAutoJoin(
                                        snapshot.id,
                                    );
                                }
                                return;
                            }

                            if (
                                event.target.closest(
                                    ".classes-create-agenda-btn",
                                )
                            ) {
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

                            if (
                                event.target.closest(
                                    ".classes-class-settings-btn",
                                )
                            ) {
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
                                event.target.closest(
                                    ".classes-toggle-view-btn",
                                ) &&
                                teacherAccount
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
                                const classId = String(
                                    subnavClassButton.dataset.classId ?? "",
                                ).trim();
                                if (!classId) return;
                                selectedClassId = classId;
                                selectedSeatNumber = null;
                                syncActiveBoardPanelWithSnapshot();
                                await loadSelectedClassMeta();
                                refreshDom();
                                refreshSubNavigation();
                                composer.refreshFooter();
                                return;
                            }

                            const quickApproveButton = event.target.closest(
                                ".classes-quick-approve-btn",
                            );
                            if (
                                quickApproveButton instanceof HTMLElement &&
                                selectedClassId
                            ) {
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
                                        variant: response.ok
                                            ? "success"
                                            : "error",
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
                                            selectedClassId = "";
                                            selectedSeatNumber = null;
                                        }
                                        await refreshContent();
                                    },
                                });
                                return;
                            }

                            if (
                                event.target.closest(
                                    ".classes-save-materials-btn",
                                )
                            ) {
                                if (!snapshot) return;
                                const materialsInput =
                                    root.querySelector("#classes-materials");
                                const homeworkInput =
                                    root.querySelector("#classes-homework");
                                if (
                                    !(
                                        materialsInput instanceof
                                        HTMLTextAreaElement
                                    ) ||
                                    !(
                                        homeworkInput instanceof
                                        HTMLTextAreaElement
                                    )
                                ) {
                                    return;
                                }
                                const response = await apiFetch(
                                    `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/resources`,
                                    {
                                        method: "PUT",
                                        headers: {
                                            "content-type": "application/json",
                                        },
                                        body: JSON.stringify({
                                            materials:
                                                materialsInput.value ?? "",
                                            homework: homeworkInput.value ?? "",
                                        }),
                                    },
                                );
                                showToast(
                                    i18n.t(
                                        response.ok
                                            ? "module.study.classes.materials_saved"
                                            : "module.study.classes.materials_save_failed",
                                    ),
                                    {
                                        variant: response.ok
                                            ? "success"
                                            : "error",
                                    },
                                );
                                if (response.ok) {
                                    await loadSelectedClassMeta();
                                    refreshDom();
                                }
                                return;
                            }

                            if (
                                event.target.closest(
                                    ".classes-save-notebook-btn",
                                )
                            ) {
                                if (!snapshot) return;
                                const notebookInput = root.querySelector(
                                    "#classes-own-notebook",
                                );
                                if (
                                    !(
                                        notebookInput instanceof
                                        HTMLTextAreaElement
                                    )
                                ) {
                                    return;
                                }
                                const response = await apiFetch(
                                    `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/notebook`,
                                    {
                                        method: "PUT",
                                        headers: {
                                            "content-type": "application/json",
                                        },
                                        body: JSON.stringify({
                                            noteText: notebookInput.value ?? "",
                                        }),
                                    },
                                );
                                showToast(
                                    i18n.t(
                                        response.ok
                                            ? "module.study.classes.notebook_saved"
                                            : "module.study.classes.notebook_save_failed",
                                    ),
                                    {
                                        variant: response.ok
                                            ? "success"
                                            : "error",
                                    },
                                );
                                if (response.ok) {
                                    selectedNotebookText =
                                        notebookInput.value ?? "";
                                }
                                return;
                            }

                            if (
                                event.target.closest(
                                    ".classes-open-notebook-btn",
                                )
                            ) {
                                if (!snapshot) return;
                                const studentId = String(
                                    event.target.closest(
                                        ".classes-open-notebook-btn",
                                    )?.dataset?.studentId ?? "",
                                ).trim();
                                if (!studentId) return;
                                const response = await apiFetch(
                                    `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/notebooks/${encodeURIComponent(studentId)}`,
                                );
                                if (!response.ok) {
                                    showToast(
                                        i18n.t(
                                            "module.study.classes.notebook_load_failed",
                                        ),
                                        {
                                            variant: "error",
                                        },
                                    );
                                    return;
                                }
                                const payload = await response.json();
                                await openPopup({
                                    title: i18n.t(
                                        "module.study.classes.open_notebook",
                                    ),
                                    body: `<p>${escapeHtml(payload?.data?.noteText || i18n.t("module.study.classes.empty_notebook"))}</p>`,
                                    actions: [
                                        {
                                            id: "close",
                                            label: i18n.t("ui.reuse.close"),
                                            variant: "confirm",
                                        },
                                    ],
                                });
                                return;
                            }

                            if (
                                event.target.closest(
                                    ".classes-open-homework-btn",
                                )
                            ) {
                                await openPopup({
                                    title: i18n.t(
                                        "module.study.classes.open_textbook",
                                    ),
                                    body: `<p>${escapeHtml(classResources.homework || i18n.t("module.study.classes.no_homework_assigned"))}</p>`,
                                    actions: [
                                        {
                                            id: "close",
                                            label: i18n.t("ui.reuse.close"),
                                            variant: "confirm",
                                        },
                                    ],
                                });
                                return;
                            }

                            if (
                                event.target.closest(
                                    ".classes-leave-classroom-btn",
                                )
                            ) {
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
                                event.target.closest(
                                    ".classes-toggle-notepad-btn",
                                )
                            ) {
                                if (!snapshot) return;
                                notepadVisible = !notepadVisible;
                                if (!classroomNotepad) {
                                    classroomNotepad = createClassroomNotepad({
                                        classId: snapshot.id,
                                        i18n: (key) => i18n.t(key),
                                    });
                                }
                                const blackboard = root.querySelector(
                                    ".classes-blackboard",
                                );
                                if (!blackboard) return;
                                const existing = blackboard.querySelector(
                                    ".classes-notepad-panel",
                                );
                                if (notepadVisible) {
                                    if (!existing) {
                                        blackboard.appendChild(
                                            classroomNotepad.getElement(),
                                        );
                                    } else {
                                        existing.hidden = false;
                                    }
                                    classroomNotepad.focus();
                                } else if (existing) {
                                    existing.hidden = true;
                                }
                                return;
                            }

                            if (
                                event.target.closest(
                                    ".classes-open-whiteboard-btn",
                                )
                            ) {
                                if (!snapshot || !classroomWindows) return;
                                const btn = event.target.closest(
                                    ".classes-open-whiteboard-btn",
                                );
                                const boardId = String(
                                    btn?.dataset?.boardId ?? "",
                                ).trim();
                                const boardName = String(
                                    btn?.dataset?.boardName ?? "",
                                ).trim();
                                if (!boardId) return;
                                const tokenResponse = await apiFetch(
                                    `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/whiteboards/${encodeURIComponent(boardId)}/token`,
                                );
                                if (!tokenResponse.ok) {
                                    const errPayload = await tokenResponse
                                        .json()
                                        .catch(() => null);
                                    const code = String(
                                        errPayload?.error?.code ?? "",
                                    );
                                    showToast(
                                        i18n.t(
                                            code === "not_configured"
                                                ? "module.study.classes.whiteboard_not_configured"
                                                : "module.study.classes.whiteboard_open_failed",
                                        ),
                                        { variant: "error" },
                                    );
                                    return;
                                }
                                const tokenPayload = await tokenResponse.json();
                                classroomWindows.openWhiteboard({
                                    boardId,
                                    boardName,
                                    embedUrl:
                                        tokenPayload?.data?.embedUrl ?? "",
                                });
                                return;
                            }

                            if (
                                event.target.closest(
                                    ".classes-create-whiteboard-btn",
                                ) &&
                                isTeacherView()
                            ) {
                                if (!snapshot) return;
                                const result = await openPopup({
                                    title: i18n.t(
                                        "module.study.classes.new_whiteboard",
                                    ),
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
                                if (result !== "create") return;
                                const nameInput = document.querySelector(
                                    ".classes-whiteboard-name-input",
                                );
                                const name =
                                    nameInput instanceof HTMLInputElement
                                        ? nameInput.value.trim()
                                        : "";
                                const createResponse = await apiFetch(
                                    `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/whiteboards`,
                                    {
                                        method: "POST",
                                        headers: {
                                            "content-type": "application/json",
                                        },
                                        body: JSON.stringify({
                                            name:
                                                name ||
                                                i18n.t(
                                                    "module.study.classes.whiteboard",
                                                ),
                                        }),
                                    },
                                );
                                showToast(
                                    i18n.t(
                                        createResponse.ok
                                            ? "module.study.classes.whiteboard_created"
                                            : "module.study.classes.whiteboard_create_failed",
                                    ),
                                    {
                                        variant: createResponse.ok
                                            ? "success"
                                            : "error",
                                    },
                                );
                                if (createResponse.ok) {
                                    await loadSelectedClassMeta();
                                    refreshDom();
                                }
                                return;
                            }

                            const deleteWhiteboardBtn = event.target.closest(
                                ".classes-delete-whiteboard-btn",
                            );
                            if (
                                deleteWhiteboardBtn instanceof HTMLElement &&
                                isTeacherView()
                            ) {
                                if (!snapshot) return;
                                const boardId = String(
                                    deleteWhiteboardBtn.dataset.boardId ?? "",
                                ).trim();
                                const boardName = String(
                                    deleteWhiteboardBtn.dataset.boardName ?? "",
                                ).trim();
                                if (!boardId) return;
                                const result = await openPopup({
                                    title: i18n.t(
                                        "module.study.classes.delete_whiteboard_title",
                                    ),
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
                                if (result !== "delete") return;
                                if (
                                    classroomWindows?.isWhiteboardOpen() &&
                                    classroomWindows.getActiveWhiteboardId() ===
                                        boardId
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
                                    {
                                        variant: deleteResponse.ok
                                            ? "success"
                                            : "error",
                                    },
                                );
                                if (deleteResponse.ok) {
                                    await loadSelectedClassMeta();
                                    refreshDom();
                                }
                                return;
                            }

                            const joinButton =
                                event.target.closest(".classes-join-btn");
                            if (joinButton instanceof HTMLElement) {
                                const classId =
                                    joinButton.dataset.classId ?? "";
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
                                        variant: response.ok
                                            ? "success"
                                            : "error",
                                    },
                                );
                                if (response.ok) {
                                    await refreshContent();
                                }
                                return;
                            }

                            const filterButton =
                                event.target.closest("[data-language]");
                            if (filterButton instanceof HTMLElement) {
                                selectedLanguageFilter =
                                    filterButton.dataset.language ?? "";
                                await loadAvailableClasses();
                                refreshDom();
                                return;
                            }
                        },
                        { signal },
                    );
                    root.addEventListener("error", handleProfileAvatarError, {
                        signal,
                        capture: true,
                    });

                    root.addEventListener(
                        "input",
                        async (event) => {
                            if (
                                !(event.target instanceof HTMLInputElement) ||
                                !event.target.classList.contains(
                                    "classes-available-search",
                                )
                            ) {
                                return;
                            }
                            searchQuery = event.target.value.trim();
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
                },
            },
        ],
        preferenceKey: "classes-classroom-layout",
        i18n,
        pageContext: {
            title: i18n.t("module.study.classes.classroom_page_title"),
            subtitle: i18n.t("module.study.classes.classroom_page_subtitle"),
        },
        subNavigation: [
            {
                id: "classes-classroom-subnav",
                label: i18n.t("module.study.classes.classroom_select_class"),
                render: renderSubNavigationMarkup,
            },
        ],
        footer: [footerItem],
    });
    await composer.init();
    void hydrateProfileAvatars(root);
    classroomWindows = createClassroomWindows({ root, i18n });
    classroomWindows.reattach();
    startClassroomRealtimeRefresh({
        signal,
        shouldRefresh: () => !isTeacherView(),
        refresh: async () => {
            await loadClassrooms();
            refreshSnapshotPresence();
            syncActiveBoardPanelWithSnapshot();
            refreshDynamicDom();
            composer.refreshFooter();
            refreshSubNavigation();
            if (selectedClassId && classroomWindows) {
                await classroomWindows.tryAutoJoin(selectedClassId);
            }
        },
    });
}

await mountWhenDirect(mount);
