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
    setClassroomViewMode,
} from "/static/adapters/study/classes/view-mode.js";
import { renderClassroomPage } from "/static/adapters/study/classes/classroom-render.js";
import { handleClassroomExit } from "/static/adapters/study/classes/classroom-exit.js";
import { createClassroomPresenceController } from "/static/adapters/study/classes/classroom-presence.js";
import { openClassSettingsPopup } from "/static/adapters/study/classes/classroom-popups.js";
import { openAgendaPopup } from "/static/adapters/study/classes/classroom-agenda-popup.js";
import { renderClassroomSubNavigation } from "/static/adapters/study/classes/classroom-sub-navigation.js";
import { startClassroomRealtimeRefresh } from "/static/adapters/study/classes/classroom-realtime.js";
import { createClassroomWindows } from "/static/adapters/study/classes/classroom-windows.js";
import { createDynamicDomRefresher } from "/static/adapters/study/classes/classroom-dynamic-refresh.js";
import { createBoardEntityStore } from "/static/adapters/study/classes/classroom-board.js";
import { openSeatActionMenu } from "/static/adapters/study/classes/classroom-seat-menu.js";
import { createClassroomNotepad } from "/static/adapters/study/notepad/classroom-notepad.js";
import { handleWhiteboardAndNotepadActions } from "/static/adapters/study/classes/classroom-whiteboard-actions.js";
import { handleResourceActions } from "/static/adapters/study/classes/classroom-resource-actions.js";
import { handleFileActions } from "/static/adapters/study/classes/classroom-file-actions.js";
import { bindClassroomInteractions } from "/static/adapters/study/classes/classroom/interactions.js";

function buildQuery(params) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value == null || value === "") continue;
        query.set(key, String(value));
    }
    return query.toString();
}

function normalizeBoardFocus(input) {
    const normalized = String(input ?? "")
        .trim()
        .toLowerCase();
    if (normalized === "classroom") return "classroom";
    if (normalized === "chat") return "chat";
    return "agenda";
}

function normalizeWorkspaceMode(input) {
    const normalized = String(input ?? "")
        .trim()
        .toLowerCase();
    if (
        normalized === "roster" ||
        normalized === "notepad" ||
        normalized === "whiteboard" ||
        normalized === "meeting" ||
        normalized === "chat"
    ) {
        return normalized;
    }
    return "agenda";
}

function emptyClassResources() {
    return { materials: "", homework: "", files: [] };
}

export async function mount(root, { signal } = {}) {
    applyClassroomViewModeFromUrl();
    const referrerUrl = document.referrer
        ? new URL(document.referrer, window.location.origin)
        : null;
    const previousPath =
        referrerUrl?.origin === window.location.origin &&
        referrerUrl?.pathname !== window.location.pathname
            ? referrerUrl.pathname + referrerUrl.search
            : "/";
    const i18n = await createI18n({
        componentStringBaseUrls: [
            "/static/adapters/study/notepad/languages",
            "/static/modules/nextcloud-whiteboard/languages",
        ],
    });
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
    let classResources = emptyClassResources();
    let activeAgendaItems = [];
    let selectedLanguageFilter = "";
    let searchQuery = "";
    let workspaceMode = "agenda";
    let lastNonMeetingWorkspaceMode = "agenda";
    const presenceByAccountId = new Map();
    const boardEntityStore = createBoardEntityStore();
    let interactionsBound = false;
    /** Initialised after composer.init(); used by the click handler via closure. */
    let classroomWindows = null;
    let classroomNotepad = null;
    let classroomNotepadClassId = "";
    let whiteboards = [];
    let activeWhiteboard = null;
    let activeMeetingId = null;
    let studentJoinedMeetingId = null;

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

    function getSelectedActiveWhiteboardId(snapshot = selectedSnapshot()) {
        const activeWhiteboardId = String(
            snapshot?.classroom?.activeWhiteboardId ?? "",
        ).trim();
        return activeWhiteboardId || null;
    }

    async function persistActiveWhiteboardId(classId, nextActiveWhiteboardId) {
        const normalizedClassId = String(classId ?? "").trim();
        if (!teacherAccount || !normalizedClassId) {
            return false;
        }
        const response = await apiFetch(
            `/api/v1/study/classrooms/${encodeURIComponent(normalizedClassId)}/layout`,
            {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    activeWhiteboardId: nextActiveWhiteboardId ?? null,
                }),
            },
        );
        if (!response.ok) {
            return false;
        }
        const payload = await response.json().catch(() => null);
        const nextState = payload?.data ?? {
            activeWhiteboardId: nextActiveWhiteboardId ?? null,
        };
        classroomSnapshots = classroomSnapshots.map((snapshot) =>
            snapshot.id === normalizedClassId
                ? {
                      ...snapshot,
                      classroom: {
                          ...(snapshot.classroom ?? {}),
                          ...nextState,
                      },
                  }
                : snapshot,
        );
        return true;
    }

    function syncGlobalChatTarget() {
        const chatToggle = root.querySelector("#global-chat-toggle");
        if (!(chatToggle instanceof HTMLElement)) return;
        const chatUrl = String(selectedSnapshot()?.chatUrl ?? "").trim();
        chatToggle.dataset.chatTarget = chatUrl;
    }

    function getDefaultWorkspaceMode() {
        if (!isTeacherView()) {
            const snapshot = selectedSnapshot();
            const boardFocus = normalizeBoardFocus(
                snapshot?.classroom?.boardFocus,
            );
            if (boardFocus === "classroom") return "roster";
            return "chat";
        }
        const snapshot = selectedSnapshot();
        return snapshot &&
            normalizeBoardFocus(snapshot?.classroom?.boardFocus) === "classroom"
            ? "roster"
            : "agenda";
    }

    function getWorkspaceMode() {
        if (classroomWindows?.isMeetingOpen()) {
            return "meeting";
        }
        return workspaceMode;
    }

    function setWorkspaceMode(nextMode, { remember = true } = {}) {
        const normalizedMode = normalizeWorkspaceMode(nextMode);
        workspaceMode = normalizedMode;
        if (normalizedMode !== "meeting" && remember) {
            lastNonMeetingWorkspaceMode = normalizedMode;
        }
    }

    function syncStudentWorkspaceAccess(snapshot = selectedSnapshot()) {
        if (isTeacherView()) {
            return;
        }
        const defaultWorkspaceMode = getDefaultWorkspaceMode();
        if (
            workspaceMode === "meeting" &&
            !classroomWindows?.isMeetingOpen() &&
            !activeMeetingId
        ) {
            setWorkspaceMode(defaultWorkspaceMode, { remember: false });
        }
        if (
            workspaceMode === "whiteboard" &&
            !getSelectedActiveWhiteboardId(snapshot) &&
            !activeWhiteboard?.embedUrl
        ) {
            setWorkspaceMode(defaultWorkspaceMode, { remember: false });
        }
        if (workspaceMode === "agenda" || workspaceMode === "roster") {
            setWorkspaceMode(defaultWorkspaceMode, { remember: false });
        }
        if (activeMeetingId && workspaceMode !== "meeting") {
            setWorkspaceMode("meeting", { remember: false });
        }
        const activeWhiteboardId = getSelectedActiveWhiteboardId(snapshot);
        if (
            activeWhiteboardId &&
            workspaceMode !== "whiteboard" &&
            workspaceMode !== "meeting"
        ) {
            setWorkspaceMode("whiteboard", { remember: false });
        }
    }

    function syncWorkspaceModeWithSnapshot({ force = false } = {}) {
        const nextMode = getDefaultWorkspaceMode();
        if (
            force ||
            workspaceMode === "agenda" ||
            workspaceMode === "roster" ||
            workspaceMode === "meeting"
        ) {
            setWorkspaceMode(nextMode);
            return;
        }
        if (
            lastNonMeetingWorkspaceMode !== "notepad" &&
            lastNonMeetingWorkspaceMode !== "whiteboard"
        ) {
            lastNonMeetingWorkspaceMode = nextMode;
        }
    }

    function getBoardEntities(snapshot) {
        return boardEntityStore.get(snapshot);
    }

    function setBoardEntity(classId, kind, x, y) {
        boardEntityStore.set(classId, kind, x, y);
    }

    async function loadClassrooms() {
        const response = await apiFetch(`/api/v1/study/classrooms`);
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
        syncWorkspaceModeWithSnapshot({ force: true });
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
            classResources = emptyClassResources();
            activeAgendaItems = [];
            whiteboards = [];
            activeWhiteboard = null;
            activeMeetingId = null;
            return;
        }
        const [
            resourcesResponse,
            notebookResponse,
            agendaResponse,
            whiteboardsResponse,
            activeMeetingResponse,
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
            apiFetch(
                `/api/v1/modules/jitsi-meet/meetings/active?classroomId=${encodeURIComponent(snapshot.id)}`,
            ).catch(() => null),
        ]);
        classResources = resourcesResponse.ok
            ? ((await resourcesResponse.json())?.data ?? emptyClassResources())
            : emptyClassResources();
        selectedNotebookText = notebookResponse.ok
            ? String((await notebookResponse.json())?.data?.noteText ?? "")
            : "";
        activeAgendaItems = agendaResponse.ok
            ? ((await agendaResponse.json())?.data?.activeItems ?? [])
            : [];
        const activeMeetingPayload = activeMeetingResponse?.ok
            ? await activeMeetingResponse.json().catch(() => ({ data: [] }))
            : { data: [] };
        const activeMeetings = Array.isArray(activeMeetingPayload?.data)
            ? activeMeetingPayload.data
            : [];
        const activeMeeting = activeMeetings.find((meeting) => {
            const meetingClassroomId = String(
                meeting?.classroomId ??
                    meeting?.classId ??
                    meeting?.classroom?.id ??
                    "",
            ).trim();
            return meetingClassroomId === snapshot.id;
        });
        activeMeetingId = String(activeMeeting?.id ?? "").trim() || null;
        whiteboards = whiteboardsResponse.ok
            ? ((await whiteboardsResponse.json())?.data ?? [])
            : [];
        const selectedActiveWhiteboardId =
            getSelectedActiveWhiteboardId(snapshot);
        if (!isTeacherView()) {
            whiteboards = selectedActiveWhiteboardId
                ? whiteboards.filter(
                      (board) =>
                          String(board?.id ?? "") ===
                          selectedActiveWhiteboardId,
                  )
                : [];
        }
        if (activeWhiteboard) {
            const match = whiteboards.find(
                (board) => String(board?.id ?? "") === activeWhiteboard.boardId,
            );
            if (!match) {
                activeWhiteboard = null;
            } else {
                activeWhiteboard = {
                    ...activeWhiteboard,
                    boardName: String(
                        match?.name ?? activeWhiteboard.boardName,
                    ),
                };
            }
        }
        if (
            !isTeacherView() &&
            activeWhiteboard?.boardId !== selectedActiveWhiteboardId
        ) {
            activeWhiteboard = null;
        }
        syncStudentWorkspaceAccess(snapshot);
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
        if (normalizedFocus === "classroom") {
            setWorkspaceMode("roster");
        } else if (normalizedFocus === "chat") {
            setWorkspaceMode("chat");
        } else {
            setWorkspaceMode("agenda");
        }
    }

    function renderSubNavigationMarkup() {
        return renderClassroomSubNavigation({
            i18n,
            classes: footerClasses,
            selectedClassId,
            isTeacherView: isTeacherView(),
        });
    }

    function refreshSubNavigation() {
        const subNav = root.querySelector(".page-subnav");
        if (subNav instanceof HTMLElement) {
            subNav.innerHTML = renderSubNavigationMarkup();
        }
    }

    function openClassSearch() {
        navigateTo("/my-classes");
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
            workspaceMode: getWorkspaceMode(),
            whiteboards,
            activeWhiteboard,
            activeWhiteboardId: getSelectedActiveWhiteboardId(snapshot),
            hasActiveMeeting: Boolean(activeMeetingId),
            isChatOpen: classroomWindows?.isChatOpen() ?? false,
            isMeetingOpen: classroomWindows?.isMeetingOpen() ?? false,
        });
    }

    function refreshDom() {
        const content = root.querySelector(".classes-classroom-content");
        if (content instanceof HTMLElement) {
            classroomWindows?.hoist();
            content.outerHTML = renderContentMarkup();
            const nextSnapshot = selectedSnapshot();
            const notepadHost = root.querySelector(".classes-notepad-host");
            if (notepadHost instanceof HTMLElement && nextSnapshot) {
                if (
                    !classroomNotepad ||
                    classroomNotepadClassId !== nextSnapshot.id
                ) {
                    classroomNotepad = createClassroomNotepad({
                        classId: nextSnapshot.id,
                        i18n,
                    });
                    classroomNotepadClassId = nextSnapshot.id;
                }
                notepadHost.replaceChildren(classroomNotepad.getElement());
                if (getWorkspaceMode() === "notepad") {
                    classroomNotepad.focus();
                }
            }
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
        getWorkspaceMode,
    });

    async function refreshContent() {
        await refreshData();
        refreshSnapshotPresence();
        footerClasses = await loadFooterClasses();
        refreshDom();
        syncGlobalChatTarget();
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
            const previousClassId = selectedClassId;
            const previousInlineWhiteboardId =
                activeWhiteboard?.boardId ?? null;
            selectedClassId = classId;
            selectedSeatNumber = null;
            activeWhiteboard = null;
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
            syncGlobalChatTarget();
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
                    bindClassroomInteractions({
                        root,
                        signal,
                        i18n,
                        apiFetch,
                        openPopup,
                        escapeHtml,
                        navigateTo,
                        bindProfilePreviews,
                        getInteractionsBound: () => interactionsBound,
                        setInteractionsBound: (value) => {
                            interactionsBound = value;
                        },
                        selectedSnapshot,
                        getSelectedClassId: () => selectedClassId,
                        setSelectedClassId: (classId) => {
                            selectedClassId = classId;
                        },
                        getSelectedSeatNumber: () => selectedSeatNumber,
                        setSelectedSeatNumber: (seatNumber) => {
                            selectedSeatNumber = seatNumber;
                        },
                        getActiveWhiteboard: () => activeWhiteboard,
                        setActiveWhiteboard: (whiteboard) => {
                            activeWhiteboard = whiteboard;
                        },
                        getSelectedActiveWhiteboardId,
                        getActiveMeetingId: () => activeMeetingId,
                        getTeacherAccount: () => teacherAccount,
                        getClassroomViewMode,
                        setClassroomViewMode,
                        isTeacherView,
                        getClassroomWindows: () => classroomWindows,
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
                        refreshComposerFooter: () => composer.refreshFooter(),
                        syncWorkspaceModeWithSnapshot,
                        syncGlobalChatTarget,
                        showToast,
                        handleClassroomExit,
                        handleResourceActions,
                        handleWhiteboardAndNotepadActions,
                        handleFileActions,
                        getClassResources: () => classResources,
                        loadSelectedClassMeta,
                        getClassroomNotepad: () => classroomNotepad,
                        setClassroomNotepad: (notepad) => {
                            classroomNotepad = notepad;
                        },
                        getClassroomNotepadClassId: () =>
                            classroomNotepadClassId,
                        setClassroomNotepadClassId: (classId) => {
                            classroomNotepadClassId = classId;
                        },
                        createClassroomNotepad,
                        persistActiveWhiteboardId,
                        loadAvailableClasses,
                        setSelectedLanguageFilter: (language) => {
                            selectedLanguageFilter = language;
                        },
                        setSearchQuery: (queryText) => {
                            searchQuery = queryText;
                        },
                        setNotebookText: (text) => {
                            selectedNotebookText = text;
                        },
                        setBoardEntity,
                    });
                    root.addEventListener("error", handleProfileAvatarError, {
                        signal,
                        capture: true,
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
        showChatToggle: true,
    });
    await composer.init();
    const pageContent = root.querySelector(".page-content");
    if (pageContent instanceof HTMLElement) {
        pageContent.classList.add("classes-classroom-page-content");
    }
    void hydrateProfileAvatars(root);
    syncGlobalChatTarget();
    classroomWindows = createClassroomWindows({
        root,
        i18n,
        isTeacher: Boolean(teacherAccount && isTeacherView()),
        signal,
        onMeetingVisibilityChange: (visible) => {
            if (visible) {
                setWorkspaceMode("meeting", { remember: false });
            } else {
                setWorkspaceMode(lastNonMeetingWorkspaceMode, {
                    remember: false,
                });
            }
            refreshDom();
        },
        onWhiteboardVisibilityChange: ({ visible, classId, boardId }) => {
            if (!teacherAccount || !classId) {
                return;
            }
            void persistActiveWhiteboardId(
                classId,
                visible ? (boardId ?? null) : null,
            );
        },
    });
    classroomWindows.reattach();
    startClassroomRealtimeRefresh({
        signal,
        shouldRefresh: () => !isTeacherView(),
        refresh: async () => {
            const previousActiveMeetingId = activeMeetingId;
            await loadClassrooms();
            await loadSelectedClassMeta();
            if (activeMeetingId && activeMeetingId !== previousActiveMeetingId) {
                studentJoinedMeetingId = null;
            }
            refreshSnapshotPresence();
            syncStudentWorkspaceAccess();
            refreshDynamicDom();
            syncGlobalChatTarget();
            composer.refreshFooter();
            refreshSubNavigation();
            if (selectedClassId && classroomWindows && activeMeetingId) {
                if (!classroomWindows.isMeetingOpen()) {
                    if (
                        classroomWindows.isAuthBlocked() &&
                        activeMeetingId !== studentJoinedMeetingId
                    ) {
                        classroomWindows.resetAuthBlocked();
                    }
                    if (activeMeetingId !== studentJoinedMeetingId) {
                        studentJoinedMeetingId = activeMeetingId;
                        await classroomWindows.tryAutoJoin(selectedClassId);
                        if (classroomWindows.isMeetingOpen()) {
                            setWorkspaceMode("meeting", { remember: false });
                            refreshDom();
                        } else {
                            syncStudentWorkspaceAccess();
                            refreshDom();
                        }
                    }
                } else {
                    setWorkspaceMode("meeting", { remember: false });
                    refreshDom();
                }
            } else {
                syncStudentWorkspaceAccess();
                refreshDom();
            }
        },
    });
}

await mountWhenDirect(mount);
